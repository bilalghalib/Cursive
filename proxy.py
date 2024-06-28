from flask import Flask, request, jsonify, make_response, send_from_directory, render_template
from flask_cors import CORS
import os
import anthropic
import logging
import uuid
import json
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
            
        return render_template('index.html', page_id=page_id, page_data=page_data)
    except Exception as e:
        logging.error(f"Error serving page {page_id}: {str(e)}")
        return f"Error loading page: {str(e)}", 500

# Serve other static files
@app.route('/<path:path>')
def serve_static_file(path):
    return send_from_directory(app.static_folder, path)

@app.route('/static/config/config.yaml')
def serve_config():
    return send_from_directory(os.path.join(base_dir, 'static', 'config'), 'config.yaml')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5022, debug=True)
    