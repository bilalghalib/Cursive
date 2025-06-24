# Cursive
 CursiveGPT
What if you could write longhand in your journal, and your journal wrote back?

A new page is turned<br>
Hear ideas echoing<br>
Across the wire<br>
<img width="759" alt="Screenshot 2024-06-27 at 22 06 22" src="https://github.com/bilalghalib/Cursive/assets/3254792/41829109-9f4a-406a-b3a1-68be6b4d5b96">

## Setup

1. Create a `.env` file and set your Claude API key:

   ```
   CLAUDE_API_KEY=your_key_here
   ```

## Running the server

Start the Flask server during development:

```bash
python proxy.py
```

For a production deployment run:

```bash
gunicorn wsgi:app
```

The app listens on port `5022`. Visit `http://localhost:5022/` in your browser.

## Using the Frontend

Use the toolbar on the left to draw or pan around the infinite canvas. Select an
area and the content is sent to Claude for a response which streams directly
onto the page. Your work is stored in the `pages/` directory and can be shared
or exported.
