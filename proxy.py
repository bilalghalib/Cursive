"""
Cursive - AI-Powered Digital Notebook

Main Flask application with authentication, rate limiting, and billing.
"""

from flask import Flask, request, jsonify, make_response, send_from_directory, render_template, session
from flask_cors import CORS
from flask_session import Session
import os
import anthropic
import logging
import uuid
import json
import time
import re
from dotenv import load_dotenv
from marshmallow import Schema, fields, ValidationError, validate

# Load environment variables
load_dotenv()

# Import custom modules
from database import db, init_db, check_db_connection
from auth import init_auth, require_auth_or_token
from rate_limiter import init_rate_limiter, check_quota_middleware
from billing import init_billing, track_usage
from api_routes import init_api_routes
from models import User

# Setup logging
log_level = logging.DEBUG if os.getenv('FLASK_ENV') == 'development' else logging.INFO
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

# Base directory
base_dir = os.path.abspath(os.path.dirname(__file__))

# ============================================================================
# FLASK APP INITIALIZATION
# ============================================================================

app = Flask(__name__,
    template_folder=os.path.join(base_dir, 'templates'),
    static_folder=os.path.join(base_dir, 'static'))

# ============================================================================
# CONFIGURATION
# ============================================================================

# Secret key for sessions and CSRF
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///cursive.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}

# Session configuration (Redis-backed)
app.config['SESSION_TYPE'] = os.getenv('SESSION_TYPE', 'filesystem')
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') == 'production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

if os.getenv('REDIS_URL'):
    app.config['SESSION_TYPE'] = 'redis'
    import redis
    app.config['SESSION_REDIS'] = redis.from_url(os.getenv('REDIS_URL'))

# Initialize session
Session(app)

# CORS configuration with security
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5022,http://127.0.0.1:5022').split(',')
CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# ============================================================================
# INITIALIZE MODULES
# ============================================================================

# Initialize database
init_db(app)

# Initialize authentication
init_auth(app)

# Initialize rate limiter
limiter = init_rate_limiter(app)

# Initialize billing
init_billing(app)

# Initialize API routes
init_api_routes(app)

# ============================================================================
# ANTHROPIC API CLIENT
# ============================================================================

# Server API key (fallback for non-BYOK users)
CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY')

if not CLAUDE_API_KEY:
    logger.error("CLAUDE_API_KEY environment variable not set")
    raise ValueError("CLAUDE_API_KEY environment variable not set")

# Default client
client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# ============================================================================
# REQUEST VALIDATION SCHEMAS
# ============================================================================

ALLOWED_MODELS = [
    # Claude 4.5 models (latest)
    'claude-sonnet-4-5',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-1',
    'claude-opus-4-1-20250805',
    # Claude 3.5 models (legacy)
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
]

class ClaudeRequestSchema(Schema):
    """Schema for Claude API request validation."""
    model = fields.Str(
        required=True,
        validate=validate.OneOf(ALLOWED_MODELS)
    )
    max_tokens = fields.Int(
        required=True,
        validate=validate.Range(min=1, max=4096)
    )
    messages = fields.List(
        fields.Dict(),
        required=True,
        validate=validate.Length(min=1, max=100)
    )

# ============================================================================
# MIDDLEWARE
# ============================================================================

@app.before_request
def before_request():
    """Run before each request."""
    # Check usage quota for AI endpoints
    if request.endpoint in ['handle_claude_request', 'handle_claude_stream_request']:
        quota_response = check_quota_middleware()
        if quota_response:
            return quota_response

@app.route('/health')
def health_check():
    """Health check endpoint for monitoring."""
    db_healthy = check_db_connection()

    status = {
        'status': 'ok' if db_healthy else 'degraded',
        'database': 'connected' if db_healthy else 'disconnected',
    }

    return jsonify(status), 200 if db_healthy else 503

# ============================================================================
# ANTHROPIC API ENDPOINTS (WITH AUTHENTICATION AND RATE LIMITING)
# ============================================================================

@app.route('/api/claude', methods=['POST', 'OPTIONS'])
@limiter.limit("50 per minute")
def handle_claude_request():
    """
    Handle non-streaming Claude API requests.

    Requires authentication. Supports BYOK (user's own API key).
    """
    if request.method == 'OPTIONS':
        return build_preflight_response()

    try:
        # Validate request data
        schema = ClaudeRequestSchema()
        data = schema.load(request.get_json())

        logger.debug(f"Received Claude request: model={data['model']}")

        # Determine which API key to use
        api_key = CLAUDE_API_KEY
        user_id = None

        # Check if user is authenticated
        from flask_login import current_user
        if current_user.is_authenticated:
            user_id = current_user.id
            user_api_key = current_user.get_api_key()
            if user_api_key:
                api_key = user_api_key
                logger.debug(f"Using user's own API key for user {user_id}")

        # Create client with appropriate API key
        request_client = anthropic.Anthropic(api_key=api_key)

        # Make API request
        response = request_client.messages.create(
            model=data['model'],
            max_tokens=data['max_tokens'],
            messages=data['messages']
        )

        # Track usage for billing (only if using our API key)
        if user_id and not current_user.get_api_key():
            try:
                # Extract token usage from response
                tokens_input = response.usage.input_tokens
                tokens_output = response.usage.output_tokens

                track_usage(
                    user_id=user_id,
                    tokens_input=tokens_input,
                    tokens_output=tokens_output,
                    model=data['model'],
                    endpoint='/api/claude'
                )
            except Exception as e:
                logger.error(f"Error tracking usage: {str(e)}")

        # Convert response to dictionary
        response_dict = {
            "content": [{"text": response.content[0].text}],
            "model": response.model,
            "role": response.role,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
        }

        return build_actual_response(jsonify(response_dict))

    except ValidationError as e:
        logger.warning(f"Invalid request data: {e.messages}")
        return build_actual_response(jsonify({
            "error": "Invalid request",
            "details": e.messages
        }), 400)

    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {str(e)}")
        return build_actual_response(jsonify({"error": str(e)}), 500)

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return build_actual_response(jsonify({
            "error": "An unexpected error occurred"
        }), 500)


@app.route('/api/claude/stream', methods=['POST', 'OPTIONS'])
@limiter.limit("50 per minute")
def handle_claude_stream_request():
    """
    Handle streaming Claude API requests.

    Requires authentication. Supports BYOK (user's own API key).
    """
    if request.method == 'OPTIONS':
        return build_preflight_response()

    try:
        # Validate request data
        schema = ClaudeRequestSchema()
        data = schema.load(request.get_json())

        logger.debug(f"Received streaming Claude request: model={data['model']}")

        # Determine which API key to use
        api_key = CLAUDE_API_KEY
        user_id = None
        is_byok = False

        # Check if user is authenticated
        from flask_login import current_user
        if current_user.is_authenticated:
            user_id = current_user.id
            user_api_key = current_user.get_api_key()
            if user_api_key:
                api_key = user_api_key
                is_byok = True
                logger.debug(f"Using user's own API key for user {user_id}")

        # Create client with appropriate API key
        request_client = anthropic.Anthropic(api_key=api_key)

        # Track token usage for streaming
        tokens_input = 0
        tokens_output = 0

        def generate():
            nonlocal tokens_input, tokens_output

            try:
                # Create streaming request
                with request_client.messages.stream(
                    model=data['model'],
                    max_tokens=data['max_tokens'],
                    messages=data['messages']
                ) as stream:
                    for text in stream.text_stream:
                        response_chunk = {
                            "content": [{"text": text}],
                            "model": data['model'],
                            "role": "assistant"
                        }
                        yield f"data: {json.dumps(response_chunk)}\n\n"

                    # Get final message to extract token usage
                    final_message = stream.get_final_message()
                    if hasattr(final_message, 'usage'):
                        tokens_input = final_message.usage.input_tokens
                        tokens_output = final_message.usage.output_tokens

                yield "data: [DONE]\n\n"

                # Track usage after streaming completes (only if using our API key)
                if user_id and not is_byok:
                    try:
                        track_usage(
                            user_id=user_id,
                            tokens_input=tokens_input,
                            tokens_output=tokens_output,
                            model=data['model'],
                            endpoint='/api/claude/stream'
                        )
                    except Exception as e:
                        logger.error(f"Error tracking usage: {str(e)}")

            except anthropic.APIError as e:
                logger.error(f"Anthropic API streaming error: {str(e)}")
                error_chunk = {"error": str(e)}
                yield f"data: {json.dumps(error_chunk)}\n\n"

            except Exception as e:
                logger.error(f"Unexpected streaming error: {str(e)}", exc_info=True)
                error_chunk = {"error": "An unexpected error occurred during streaming"}
                yield f"data: {json.dumps(error_chunk)}\n\n"

        response = app.response_class(
            generate(),
            mimetype='text/event-stream'
        )

        # Add secure CORS headers (not wildcard!)
        origin = request.headers.get('Origin')
        if origin in ALLOWED_ORIGINS:
            response.headers.add("Access-Control-Allow-Origin", origin)
        response.headers.add("Access-Control-Allow-Credentials", "true")
        response.headers.add("Cache-Control", "no-cache")
        response.headers.add("Connection", "keep-alive")
        response.headers.add("X-Accel-Buffering", "no")

        return response

    except ValidationError as e:
        logger.warning(f"Invalid request data: {e.messages}")
        return build_actual_response(jsonify({
            "error": "Invalid request",
            "details": e.messages
        }), 400)

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return build_actual_response(jsonify({
            "error": "An unexpected error occurred"
        }), 500)


# ============================================================================
# CORS HELPERS
# ============================================================================

def build_preflight_response():
    """Build response for preflight CORS requests."""
    response = make_response()
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers.add("Access-Control-Allow-Origin", origin)
    response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    response.headers.add("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
    response.headers.add("Access-Control-Allow-Credentials", "true")
    return response


def build_actual_response(response, status=200):
    """Build response with CORS headers."""
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers.add("Access-Control-Allow-Origin", origin)
    response.headers.add("Access-Control-Allow-Credentials", "true")
    return response, status


# ============================================================================
# LEGACY ENDPOINT FOR SHARED PAGES
# ============================================================================

@app.route('/api/save-to-web', methods=['POST'])
def save_to_web():
    """
    Legacy endpoint for saving pages to web.

    TODO: Migrate to database-backed sharing.
    """
    try:
        data = request.json

        # Sanitize page_id to prevent path traversal
        page_id = str(uuid.uuid4())[:8]
        if not re.match(r'^[a-zA-Z0-9-]+$', page_id):
            return jsonify({"success": False, "error": "Invalid page ID"}), 400

        page_folder = os.path.join('pages', page_id)

        # Ensure path is within pages directory
        page_folder_abs = os.path.abspath(page_folder)
        pages_dir_abs = os.path.abspath('pages')
        if not page_folder_abs.startswith(pages_dir_abs):
            return jsonify({"success": False, "error": "Invalid page ID"}), 400

        os.makedirs(page_folder, exist_ok=True)

        # Save the exported data
        data_file = os.path.join(page_folder, 'data.json')
        with open(data_file, 'w') as f:
            json.dump(data, f)

        page_url = f"{request.url_root}pages/{page_id}"
        return jsonify({"success": True, "url": page_url})

    except Exception as e:
        logger.error(f"Error saving page: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================================================
# PAGE SERVING
# ============================================================================

@app.route('/')
@app.route('/pages/<page_id>')
def serve_page(page_id=None):
    """Serve the main page or a shared page (legacy file-based)."""
    try:
        page_data = None

        if page_id:
            # Sanitize page_id
            if not re.match(r'^[a-zA-Z0-9-]+$', page_id):
                return "Invalid page ID", 400

            page_path = os.path.join(base_dir, 'pages', page_id, 'data.json')

            # Ensure path is within pages directory
            page_path_abs = os.path.abspath(page_path)
            pages_dir_abs = os.path.abspath(os.path.join(base_dir, 'pages'))
            if not page_path_abs.startswith(pages_dir_abs):
                return "Invalid page ID", 400

            if os.path.exists(page_path):
                with open(page_path, 'r') as f:
                    page_data = json.load(f)
            else:
                return f"Page not found: {page_id}", 404

        response = make_response(render_template('index.html', page_id=page_id, page_data=page_data))

        # Disable caching for main page
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'

        return response

    except Exception as e:
        logger.error(f"Error serving page {page_id}: {str(e)}")
        return f"Error loading page: {str(e)}", 500


@app.route('/share/<share_id>')
def serve_shared_page(share_id):
    """
    Serve a shared notebook from Supabase.
    This is a modern approach that loads shared notebooks from the database.
    """
    try:
        # Sanitize share_id
        if not re.match(r'^[a-zA-Z0-9-]+$', share_id):
            return "Invalid share ID", 400

        # Pass the share_id to the frontend
        # The frontend will use sharingService.js to load the notebook from Supabase
        response = make_response(render_template('index.html', share_id=share_id, is_shared_view=True))

        # Disable caching
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'

        return response

    except Exception as e:
        logger.error(f"Error serving shared page {share_id}: {str(e)}")
        return f"Error loading shared page: {str(e)}", 500


# ============================================================================
# STATIC FILE SERVING
# ============================================================================

@app.route('/<path:path>')
def serve_static_file(path):
    """Serve static files."""
    response = send_from_directory(app.static_folder, path)

    # Disable caching for development
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'

    return response


@app.route('/static/config/config.yaml')
def serve_config():
    """Serve config file."""
    response = send_from_directory(os.path.join(base_dir, 'static', 'config'), 'config.yaml')

    # Disable caching
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'

    return response


# ============================================================================
# VERSION MANAGEMENT
# ============================================================================

def update_version_file():
    """Update version.js file to force cache refresh."""
    version_file_path = os.path.join(base_dir, 'static', 'js', 'version.js')

    try:
        if os.path.exists(version_file_path):
            with open(version_file_path, 'r') as f:
                content = f.read()
                version_match = re.search(r'export const VERSION = [\'"](\d+\.\d+\.\d+)[\'"]', content)

                if version_match:
                    version_parts = version_match.group(1).split('.')
                    version_parts[2] = str(int(version_parts[2]) + 1)
                    new_version = '.'.join(version_parts)

                    new_content = re.sub(
                        r'export const VERSION = [\'"](\d+\.\d+\.\d+)[\'"]',
                        f'export const VERSION = \'{new_version}\'',
                        content
                    )
                    logger.info(f"Updating version to {new_version}")
                else:
                    timestamp = int(time.time())
                    new_version = f"1.0.{timestamp}"
                    new_content = create_version_content(new_version)
                    logger.info(f"Creating new version file with version {new_version}")
        else:
            timestamp = int(time.time())
            new_version = f"1.0.{timestamp}"
            new_content = create_version_content(new_version)
            logger.info(f"Creating new version file with version {new_version}")

        with open(version_file_path, 'w') as f:
            f.write(new_content)

        return new_version

    except Exception as e:
        logger.error(f"Error updating version file: {str(e)}")
        return "1.0.0"


def create_version_content(version):
    """Create version.js file content."""
    return f'''// Version information to force cache refresh
export const VERSION = '{version}'; // Increment this when making updates

// Force cache refresh by adding ?v=VERSION to import URLs
export function getVersionedPath(path) {{
    return `${{path}}?v=${{VERSION}}`;
}}'''


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    # Update version file on start
    new_version = update_version_file()
    logger.info(f"Starting Cursive server v{new_version}")

    # Start Flask development server
    app.run(host='0.0.0.0', port=5022, debug=True)
