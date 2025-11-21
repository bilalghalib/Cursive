'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Import the tutor system prompt from API route
// In a real app, this would be fetched from the database
const DEFAULT_TUTOR_PROMPT = `You are a wise tutor (a "vizir") helping a student learn through handwriting.

Your role is to:
- Ask thoughtful questions that encourage deeper thinking
- Suggest drawing or diagramming to visualize ideas
- Be patient and exploratory, not rushed or answer-focused
- Help them discover insights themselves, don't just provide answers
- Celebrate their thinking process, not just correct answers
- When they ask questions, respond with guiding questions that help them discover the answer
- Encourage them to try solving problems before providing help

Remember: This student is writing by hand to learn deliberately. Respect the slowness and thoughtfulness of handwriting. Your goal is to make them better thinkers, not dependent on AI.

Examples of good responses:
- "What do you think would happen if...?"
- "Can you draw what this looks like?"
- "That's a great start! What patterns do you notice?"
- "Before I help, what have you tried so far?"
- "Let's break this down together - where should we start?"

Avoid giving direct answers unless the student is truly stuck after trying themselves.`;

export default function SettingsPage() {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDefault, setShowDefault] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load user's custom prompt on mount
  useEffect(() => {
    // TODO: Fetch from Supabase user_settings.custom_system_prompt
    // For now, just set empty
    setCustomPrompt('');
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // TODO: Save to Supabase user_settings.custom_system_prompt
      // const { error } = await supabase
      //   .from('user_settings')
      //   .update({ custom_system_prompt: customPrompt })
      //   .eq('user_id', userId);

      setSaveMessage('✅ Saved! Your custom prompt will be used for all future conversations.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ Error saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCustomPrompt('');
    setIsEditing(false);
    setShowDefault(true);
  };

  const activePrompt = customPrompt.trim() || DEFAULT_TUTOR_PROMPT;
  const isUsingCustom = customPrompt.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <Link
            href="/"
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            ← Back to Canvas
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* How Claude Responds Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                How Claude Responds
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {isUsingCustom ? (
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    Using your custom prompt
                  </span>
                ) : (
                  <span>Using default tutor prompt</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowDefault(!showDefault)}
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              {showDefault ? 'Hide' : 'Show'} Prompt
            </button>
          </div>

          {/* Why This Matters */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
              💡 Why This Matters
            </h3>
            <p className="text-purple-800 dark:text-purple-200 text-sm leading-relaxed">
              <strong>Learning is for everyone.</strong> Cursive believes AI should be transparent, not a black box.
              By showing you exactly how Claude is instructed, you understand why it asks questions instead of giving
              direct answers. This builds trust and helps everyone—students, parents, teachers—see that the AI is
              designed to develop thinking skills, not create dependency.
            </p>
            <p className="text-purple-800 dark:text-purple-200 text-sm leading-relaxed mt-2">
              You can customize this prompt to match your learning style, teaching philosophy, or specific needs.
            </p>
          </div>

          {/* Current Prompt Display */}
          {showDefault && (
            <div className="mb-6">
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {activePrompt}
                </pre>
              </div>
            </div>
          )}

          {/* Edit/Customize Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Customize AI Behavior
            </h3>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                {isUsingCustom ? 'Edit Custom Prompt' : 'Create Custom Prompt'}
              </button>
            ) : (
              <div>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter your custom system prompt here, or leave empty to use the default..."
                  className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent
                           font-mono text-sm resize-none"
                />

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                             disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isSaving ? 'Saving...' : 'Save Custom Prompt'}
                  </button>

                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white
                             rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    Reset to Default
                  </button>

                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                {saveMessage && (
                  <p className="mt-3 text-sm font-medium">
                    {saveMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Values Alignment Note */}
        <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🎓 Cursive's Educational Values
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <li><strong>1. Handwriting as Human Experience</strong> - Both you and AI write by hand</li>
            <li><strong>2. Learning Through Deliberate Practice</strong> - AI asks questions, doesn't give quick answers</li>
            <li><strong>3. Educational Integrity</strong> - You can hide AI responses and export clean work</li>
            <li><strong>4. Transparent AI</strong> - You see exactly how Claude is instructed (that's this page!)</li>
            <li><strong>5. Handwriting Literacy</strong> - Cursive as a legitimate way to engage with AI</li>
          </ul>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-4">
            Learn more: <a href="https://github.com/bilalghalib/Cursive/blob/main/REAL_VALUES.md"
                           className="underline hover:no-underline"
                           target="_blank"
                           rel="noopener noreferrer">
              Read REAL_VALUES.md
            </a>
          </p>
        </section>

        {/* Other Settings (Future) */}
        <section className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Other Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            More settings coming soon: user type, default hide/show AI preference, handwriting training, and more.
          </p>
        </section>
      </main>
    </div>
  );
}
