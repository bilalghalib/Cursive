"""
API routes for notebooks and drawings CRUD operations.

This module provides REST API endpoints for managing notebooks and drawings,
replacing the localStorage-based system.
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from marshmallow import Schema, fields, ValidationError, validate
from database import db
from models import Notebook, Drawing
import uuid
import logging
from sqlalchemy import desc

logger = logging.getLogger(__name__)

# Create API blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')


# Validation Schemas
class NotebookCreateSchema(Schema):
    """Schema for notebook creation validation."""
    title = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255)
    )
    description = fields.Str(
        required=False,
        validate=validate.Length(max=1000)
    )


class NotebookUpdateSchema(Schema):
    """Schema for notebook update validation."""
    title = fields.Str(
        required=False,
        validate=validate.Length(min=1, max=255)
    )
    description = fields.Str(
        required=False,
        validate=validate.Length(max=1000)
    )
    is_shared = fields.Bool(required=False)


class DrawingCreateSchema(Schema):
    """Schema for drawing creation validation."""
    notebook_id = fields.Int(required=True)
    stroke_data = fields.Dict(required=False)
    transcription = fields.Str(required=False)
    ai_response = fields.Str(required=False)
    drawing_type = fields.Str(
        required=False,
        validate=validate.OneOf(['handwriting', 'typed', 'shape'])
    )
    canvas_state = fields.Dict(required=False)


def init_api_routes(app):
    """
    Initialize API routes with Flask app.

    Args:
        app: Flask application instance
    """
    app.register_blueprint(api_bp)
    logger.info("API routes initialized")


# ============================================================================
# NOTEBOOK ENDPOINTS
# ============================================================================

@api_bp.route('/notebooks', methods=['GET'])
@login_required
def get_notebooks():
    """
    Get all notebooks for the current user.

    Query params:
        limit: Maximum number of notebooks to return (default: 50)
        offset: Number of notebooks to skip (default: 0)
        include_drawings: Whether to include drawings in response (default: false)

    Returns:
        JSON response with list of notebooks
    """
    try:
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))
        include_drawings = request.args.get('include_drawings', 'false').lower() == 'true'

        # Query notebooks ordered by last updated
        notebooks = Notebook.query.filter_by(
            user_id=current_user.id
        ).order_by(
            desc(Notebook.updated_at)
        ).limit(limit).offset(offset).all()

        # Get total count
        total = Notebook.query.filter_by(user_id=current_user.id).count()

        return jsonify({
            "success": True,
            "notebooks": [n.to_dict(include_drawings=include_drawings) for n in notebooks],
            "total": total,
            "limit": limit,
            "offset": offset
        }), 200

    except Exception as e:
        logger.error(f"Error getting notebooks: {str(e)}")
        return jsonify({"error": "Failed to retrieve notebooks"}), 500


@api_bp.route('/notebooks/<int:notebook_id>', methods=['GET'])
@login_required
def get_notebook(notebook_id):
    """
    Get a specific notebook by ID.

    Args:
        notebook_id: Notebook ID

    Returns:
        JSON response with notebook data including drawings
    """
    try:
        notebook = Notebook.query.filter_by(
            id=notebook_id,
            user_id=current_user.id
        ).first()

        if not notebook:
            return jsonify({"error": "Notebook not found"}), 404

        return jsonify({
            "success": True,
            "notebook": notebook.to_dict(include_drawings=True)
        }), 200

    except Exception as e:
        logger.error(f"Error getting notebook: {str(e)}")
        return jsonify({"error": "Failed to retrieve notebook"}), 500


@api_bp.route('/notebooks', methods=['POST'])
@login_required
def create_notebook():
    """
    Create a new notebook.

    Request body:
        {
            "title": "My Notebook",
            "description": "Optional description"
        }

    Returns:
        JSON response with created notebook
    """
    try:
        # Validate request data
        schema = NotebookCreateSchema()
        data = schema.load(request.get_json())

        # Create notebook
        notebook = Notebook(
            user_id=current_user.id,
            title=data['title'],
            description=data.get('description', '')
        )

        db.session.add(notebook)
        db.session.commit()

        logger.info(f"Notebook created: {notebook.id} for user {current_user.id}")

        return jsonify({
            "success": True,
            "notebook": notebook.to_dict()
        }), 201

    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating notebook: {str(e)}")
        return jsonify({"error": "Failed to create notebook"}), 500


@api_bp.route('/notebooks/<int:notebook_id>', methods=['PUT'])
@login_required
def update_notebook(notebook_id):
    """
    Update a notebook.

    Args:
        notebook_id: Notebook ID

    Request body:
        {
            "title": "Updated Title",
            "description": "Updated description",
            "is_shared": true
        }

    Returns:
        JSON response with updated notebook
    """
    try:
        notebook = Notebook.query.filter_by(
            id=notebook_id,
            user_id=current_user.id
        ).first()

        if not notebook:
            return jsonify({"error": "Notebook not found"}), 404

        # Validate request data
        schema = NotebookUpdateSchema()
        data = schema.load(request.get_json())

        # Update fields
        if 'title' in data:
            notebook.title = data['title']
        if 'description' in data:
            notebook.description = data['description']
        if 'is_shared' in data:
            notebook.is_shared = data['is_shared']
            # Generate share ID if sharing for the first time
            if notebook.is_shared and not notebook.share_id:
                notebook.share_id = str(uuid.uuid4())[:8]

        db.session.commit()

        logger.info(f"Notebook updated: {notebook.id}")

        return jsonify({
            "success": True,
            "notebook": notebook.to_dict()
        }), 200

    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating notebook: {str(e)}")
        return jsonify({"error": "Failed to update notebook"}), 500


@api_bp.route('/notebooks/<int:notebook_id>', methods=['DELETE'])
@login_required
def delete_notebook(notebook_id):
    """
    Delete a notebook and all its drawings.

    Args:
        notebook_id: Notebook ID

    Returns:
        JSON response confirming deletion
    """
    try:
        notebook = Notebook.query.filter_by(
            id=notebook_id,
            user_id=current_user.id
        ).first()

        if not notebook:
            return jsonify({"error": "Notebook not found"}), 404

        db.session.delete(notebook)
        db.session.commit()

        logger.info(f"Notebook deleted: {notebook_id} by user {current_user.id}")

        return jsonify({
            "success": True,
            "message": "Notebook deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting notebook: {str(e)}")
        return jsonify({"error": "Failed to delete notebook"}), 500


# ============================================================================
# DRAWING ENDPOINTS
# ============================================================================

@api_bp.route('/drawings', methods=['GET'])
@login_required
def get_drawings():
    """
    Get drawings for a specific notebook.

    Query params:
        notebook_id: Notebook ID (required)
        limit: Maximum number of drawings to return (default: 100)
        offset: Number of drawings to skip (default: 0)

    Returns:
        JSON response with list of drawings
    """
    try:
        notebook_id = request.args.get('notebook_id')
        if not notebook_id:
            return jsonify({"error": "notebook_id parameter required"}), 400

        # Verify notebook belongs to user
        notebook = Notebook.query.filter_by(
            id=int(notebook_id),
            user_id=current_user.id
        ).first()

        if not notebook:
            return jsonify({"error": "Notebook not found"}), 404

        limit = min(int(request.args.get('limit', 100)), 500)
        offset = int(request.args.get('offset', 0))

        # Query drawings
        drawings = Drawing.query.filter_by(
            notebook_id=notebook_id
        ).order_by(
            desc(Drawing.created_at)
        ).limit(limit).offset(offset).all()

        # Get total count
        total = Drawing.query.filter_by(notebook_id=notebook_id).count()

        return jsonify({
            "success": True,
            "drawings": [d.to_dict() for d in drawings],
            "total": total,
            "limit": limit,
            "offset": offset
        }), 200

    except Exception as e:
        logger.error(f"Error getting drawings: {str(e)}")
        return jsonify({"error": "Failed to retrieve drawings"}), 500


@api_bp.route('/drawings/<int:drawing_id>', methods=['GET'])
@login_required
def get_drawing(drawing_id):
    """
    Get a specific drawing by ID.

    Args:
        drawing_id: Drawing ID

    Returns:
        JSON response with drawing data
    """
    try:
        drawing = Drawing.query.get(drawing_id)

        if not drawing:
            return jsonify({"error": "Drawing not found"}), 404

        # Verify drawing belongs to user's notebook
        notebook = Notebook.query.filter_by(
            id=drawing.notebook_id,
            user_id=current_user.id
        ).first()

        if not notebook:
            return jsonify({"error": "Drawing not found"}), 404

        return jsonify({
            "success": True,
            "drawing": drawing.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Error getting drawing: {str(e)}")
        return jsonify({"error": "Failed to retrieve drawing"}), 500


@api_bp.route('/drawings', methods=['POST'])
@login_required
def create_drawing():
    """
    Create a new drawing in a notebook.

    Request body:
        {
            "notebook_id": 1,
            "stroke_data": {...},
            "transcription": "Optional OCR text",
            "ai_response": "Optional AI response",
            "drawing_type": "handwriting",
            "canvas_state": {...}
        }

    Returns:
        JSON response with created drawing
    """
    try:
        # Validate request data
        schema = DrawingCreateSchema()
        data = schema.load(request.get_json())

        # Verify notebook belongs to user
        notebook = Notebook.query.filter_by(
            id=data['notebook_id'],
            user_id=current_user.id
        ).first()

        if not notebook:
            return jsonify({"error": "Notebook not found"}), 404

        # Create drawing
        drawing = Drawing(
            notebook_id=data['notebook_id'],
            stroke_data=data.get('stroke_data'),
            transcription=data.get('transcription'),
            ai_response=data.get('ai_response'),
            drawing_type=data.get('drawing_type', 'handwriting'),
            canvas_state=data.get('canvas_state')
        )

        db.session.add(drawing)
        db.session.commit()

        logger.info(f"Drawing created: {drawing.id} in notebook {data['notebook_id']}")

        return jsonify({
            "success": True,
            "drawing": drawing.to_dict()
        }), 201

    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating drawing: {str(e)}")
        return jsonify({"error": "Failed to create drawing"}), 500


@api_bp.route('/drawings/<int:drawing_id>', methods=['PUT'])
@login_required
def update_drawing(drawing_id):
    """
    Update a drawing.

    Args:
        drawing_id: Drawing ID

    Request body: Any fields from DrawingCreateSchema

    Returns:
        JSON response with updated drawing
    """
    try:
        drawing = Drawing.query.get(drawing_id)

        if not drawing:
            return jsonify({"error": "Drawing not found"}), 404

        # Verify drawing belongs to user's notebook
        notebook = Notebook.query.filter_by(
            id=drawing.notebook_id,
            user_id=current_user.id
        ).first()

        if not notebook:
            return jsonify({"error": "Drawing not found"}), 404

        data = request.get_json()

        # Update fields
        if 'stroke_data' in data:
            drawing.stroke_data = data['stroke_data']
        if 'transcription' in data:
            drawing.transcription = data['transcription']
        if 'ai_response' in data:
            drawing.ai_response = data['ai_response']
        if 'drawing_type' in data:
            drawing.drawing_type = data['drawing_type']
        if 'canvas_state' in data:
            drawing.canvas_state = data['canvas_state']

        db.session.commit()

        logger.info(f"Drawing updated: {drawing.id}")

        return jsonify({
            "success": True,
            "drawing": drawing.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating drawing: {str(e)}")
        return jsonify({"error": "Failed to update drawing"}), 500


@api_bp.route('/drawings/<int:drawing_id>', methods=['DELETE'])
@login_required
def delete_drawing(drawing_id):
    """
    Delete a drawing.

    Args:
        drawing_id: Drawing ID

    Returns:
        JSON response confirming deletion
    """
    try:
        drawing = Drawing.query.get(drawing_id)

        if not drawing:
            return jsonify({"error": "Drawing not found"}), 404

        # Verify drawing belongs to user's notebook
        notebook = Notebook.query.filter_by(
            id=drawing.notebook_id,
            user_id=current_user.id
        ).first()

        if not notebook:
            return jsonify({"error": "Drawing not found"}), 404

        db.session.delete(drawing)
        db.session.commit()

        logger.info(f"Drawing deleted: {drawing_id} by user {current_user.id}")

        return jsonify({
            "success": True,
            "message": "Drawing deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting drawing: {str(e)}")
        return jsonify({"error": "Failed to delete drawing"}), 500


# ============================================================================
# SHARED NOTEBOOKS (PUBLIC ACCESS)
# ============================================================================

@api_bp.route('/shared/<share_id>', methods=['GET'])
def get_shared_notebook(share_id):
    """
    Get a publicly shared notebook (no authentication required).

    Args:
        share_id: Share ID

    Returns:
        JSON response with notebook data
    """
    try:
        notebook = Notebook.query.filter_by(
            share_id=share_id,
            is_shared=True
        ).first()

        if not notebook:
            return jsonify({"error": "Shared notebook not found"}), 404

        return jsonify({
            "success": True,
            "notebook": notebook.to_dict(include_drawings=True)
        }), 200

    except Exception as e:
        logger.error(f"Error getting shared notebook: {str(e)}")
        return jsonify({"error": "Failed to retrieve shared notebook"}), 500
