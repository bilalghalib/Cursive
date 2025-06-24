from flask import Flask, request, jsonify, make_response, send_from_directory, render_template
from flask_cors import CORS
import os
import anthropic
import logging
import uuid
import json
import time
import re
from dotenv import load_dotenv
load_dotenv()

base_dir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__, 
        template_folder=os.path.join(base_dir, 'templates'),
        static_folder=os.path.join(base_dir, 'static'))
    
CORS(app, resources={r"/api/*": {"origins": "http://127.0.0.1:5022"}})

logging.basicConfig(level=logging.DEBUG)

# Get the API key from the environment variable
CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY')

if not CLAUDE_API_KEY:
    app.logger.error("CLAUDE_API_KEY environment variable not set")
    raise ValueError("CLAUDE_API_KEY environment variable not set")

client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

@app.route('/api/claude', methods=['POST', 'OPTIONS'])
def handle_claude_request():
    if request.method == 'OPTIONS':
        return build_preflight_response()
    elif request.method == 'POST':
        try:
            data = request.get_json()
            app.logger.debug(f"Received data: {data}")
            
            # Create the message using the Anthropic client
            response = client.messages.create(
                model=data['model'],
                max_tokens=data['max_tokens'],
                messages=data['messages']
            )
            
            # Convert the response to a dictionary
            response_dict = {
                "content": [{"text": response.content[0].text}],
                "model": response.model,
                "role": response.role,
                # Add any other fields you need from the response
            }
            
            return build_actual_response(jsonify(response_dict))
        except anthropic.APIError as e:
            app.logger.error(f"Anthropic API error: {str(e)}")
            return build_actual_response(jsonify({"error": str(e)}), 500)
        except Exception as e:
            app.logger.error(f"Unexpected error: {str(e)}")
            return build_actual_response(jsonify({"error": "An unexpected error occurred"}), 500)
    else:
        return build_actual_response(jsonify({"error": "Method not allowed"}), 405)

@app.route('/api/claude/stream', methods=['POST', 'OPTIONS'])
def handle_claude_stream_request():
    if request.method == 'OPTIONS':
        return build_preflight_response()
    elif request.method == 'POST':
        try:
            data = request.get_json()
            app.logger.debug(f"Received streaming data request: {data}")
            
            def generate():
                # Create the message using the Anthropic client with streaming
                with client.messages.stream(
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
                    yield "data: [DONE]\n\n"
            
            response = app.response_class(
                generate(),
                mimetype='text/event-stream'
            )
            
            # Add CORS headers to the response
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add("Cache-Control", "no-cache")
            response.headers.add("Connection", "keep-alive")
            response.headers.add("X-Accel-Buffering", "no")  # For Nginx
            
            return response
            
        except anthropic.APIError as e:
            app.logger.error(f"Anthropic API streaming error: {str(e)}")
            return build_actual_response(jsonify({"error": str(e)}), 500)
        except Exception as e:
            app.logger.error(f"Unexpected streaming error: {str(e)}")
            return build_actual_response(jsonify({"error": "An unexpected error occurred during streaming"}), 500)
    else:
        return build_actual_response(jsonify({"error": "Method not allowed"}), 405)

def build_preflight_response():
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST")
    return response

def build_actual_response(response, status=200):
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response, status

@app.route('/api/save-to-web', methods=['POST'])
def save_to_web():
    try:
        data = request.json
        page_id = str(uuid.uuid4())[:8]  # Generate a short UUID
        page_folder = os.path.join('pages', page_id)
        os.makedirs(page_folder, exist_ok=True)
        
        # Save the exported data to a file
        with open(os.path.join(page_folder, 'data.json'), 'w') as f:
            json.dump(data, f)
            
        page_url = f"{request.url_root}pages/{page_id}"
        return jsonify({"success": True, "url": page_url})
    except Exception as e:
        logging.error(f"Error saving page: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
    
    
@app.route('/')
@app.route('/pages/<page_id>')
def serve_page(page_id=None):
    try:
        if page_id:
            with open(os.path.join(base_dir, 'pages', page_id, 'data.json'), 'r') as f:
                page_data = json.load(f)
        else:
            page_data = None
        
        response = make_response(render_template('index.html', page_id=page_id, page_data=page_data))
        # Disable caching for main page
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        logging.error(f"Error serving page {page_id}: {str(e)}")
        return f"Error loading page: {str(e)}", 500

# Serve other static files
@app.route('/<path:path>')
def serve_static_file(path):
    response = send_from_directory(app.static_folder, path)
    # Disable caching for all static files
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/static/config/config.yaml')
def serve_config():
    response = send_from_directory(os.path.join(base_dir, 'static', 'config'), 'config.yaml')
    # Disable caching for config file
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Update version.js file to force cache refresh
def update_version_file():
    version_file_path = os.path.join(base_dir, 'static', 'js', 'version.js')
    try:
        # If file exists, read and update the version number
        if os.path.exists(version_file_path):
            with open(version_file_path, 'r') as f:
                content = f.read()
                # Find the version string using regex
                version_match = re.search(r'export const VERSION = [\'"](\d+\.\d+\.\d+)[\'"]', content)
                if version_match:
                    version_parts = version_match.group(1).split('.')
                    # Increment the patch version
                    version_parts[2] = str(int(version_parts[2]) + 1)
                    new_version = '.'.join(version_parts)
                    # Replace the version in the file
                    new_content = re.sub(
                        r'export const VERSION = [\'"](\d+\.\d+\.\d+)[\'"]', 
                        f'export const VERSION = \'{new_version}\'', 
                        content
                    )
                    logging.info(f"Updating version to {new_version}")
                else:
                    # If version not found, use a timestamp
                    timestamp = int(time.time())
                    new_version = f"1.0.{timestamp}"
                    new_content = f'// Version information to force cache refresh\n' \
                                f'export const VERSION = \'{new_version}\'; // Increment this when making updates\n\n' \
                                f'// Force cache refresh by adding ?v=VERSION to import URLs\n' \
                                f'export function getVersionedPath(path) {{\n' \
                                f'    return `${{path}}?v=${{VERSION}}`;\n' \
                                f'}}'
                    logging.info(f"Creating new version file with version {new_version}")
        else:
            # If file doesn't exist, create it with a timestamp-based version
            timestamp = int(time.time())
            new_version = f"1.0.{timestamp}"
            new_content = f'// Version information to force cache refresh\n' \
                        f'export const VERSION = \'{new_version}\'; // Increment this when making updates\n\n' \
                        f'// Force cache refresh by adding ?v=VERSION to import URLs\n' \
                        f'export function getVersionedPath(path) {{\n' \
                        f'    return `${{path}}?v=${{VERSION}}`;\n' \
                        f'}}'
            logging.info(f"Creating new version file with version {new_version}")
        
        # Write the updated content back to the file
        with open(version_file_path, 'w') as f:
            f.write(new_content)
            
        return new_version
    except Exception as e:
        logging.error(f"Error updating version file: {str(e)}")
        return "1.0.0"

if __name__ == '__main__':
    # Update version file on each start to force cache refresh
    new_version = update_version_file()
    logging.info(f"Starting Cursive server with version {new_version}")
    app.run(host='0.0.0.0', port=5022, debug=True)
    
