import Jedison from 'jedison';

/**
 * Experimental Stage 2 schema-field adapter. NO authenticated CMS, no saving,
 * no publishing, no imports of a public site's HTML/CSS/JS.
 *
 * Contracts are owned by CMS in Stage 3+. At this stage only trusted, built-in
 * test schema/values may be mounted. Do not expose to arbitrary user input.
 */
export function mount({container, schema, data, onChange = () => {}}) {
  if (!(container instanceof Element) || typeof onChange !== 'function') {
    throw new TypeError('Invalid editor container or change callback');
  }
  if (!schema || schema.type !== 'object' || schema.additionalProperties !== false
      || !schema.properties || Array.isArray(schema.properties)
      || !data || Array.isArray(data) || typeof data !== 'object') {
    throw new TypeError('Stage2 adapter expects a closed trusted object schema');
  }
  const editor = new Jedison.Create({
    container,
    theme: new Jedison.Theme(),
    schema,
    data: structuredClone(data),
    keepMissingSchemaFields: false,
    showErrors: 'input'
  });
  let closed = false;
  editor.on('change', () => {
    if (!closed) onChange(structuredClone(editor.getValue()));
  });
  return Object.freeze({
    getValue() {
      if (closed) throw new Error('Editor instance is destroyed');
      return structuredClone(editor.getValue());
    },
    destroy() {
      if (closed) return;
      closed = true;
      editor.destroy();
      container.replaceChildren();
    }
  });
}

// Compiled into a standalone IIFE by the Stage 2 build. The public website
// does NOT import this bundle, and no HTTP route exposes an admin editor.
if (typeof window !== 'undefined') {
  window.AiSiteCmsEditorStage2 = Object.freeze({mount});
}
