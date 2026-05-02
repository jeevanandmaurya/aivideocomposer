export async function processAgentCommand(
  messages: any[], 
  onChunk?: (partial: any) => void
) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Agent error");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader available");

  let resultString = '';
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    resultString += chunk;

    if (onChunk) {
      let depth = 0;
      let start = -1;
      
      for (let i = 0; i < resultString.length; i++) {
        if (resultString[i] === '{') {
          if (depth === 0) start = i;
          depth++;
        } else if (resultString[i] === '}') {
          depth--;
          if (depth === 0 && start !== -1) {
            const potentialJson = resultString.slice(start, i + 1);
            try {
              onChunk(JSON.parse(potentialJson));
            } catch (e) {}
          }
        }
      }

      // If we are currently inside an object (depth > 0), try to parse the partial state
      if (depth > 0 && start !== -1) {
        try {
          let partialStr = resultString.slice(start);
          // Append necessary closing braces to make it valid JSON
          for (let d = 0; d < depth; d++) {
            partialStr += '}';
          }
          const partial = JSON.parse(partialStr);
          onChunk(partial);
        } catch (e) {
          // It's okay if partial parse fails (e.g. in middle of a string)
        }
      }
    }
  }

  // Final parse - collect all valid JSON objects
  const objects: any[] = [];
  let currentDepth = 0;
  let currentStart = -1;
  
  for (let i = 0; i < resultString.length; i++) {
    if (resultString[i] === '{') {
      if (currentDepth === 0) currentStart = i;
      currentDepth++;
    } else if (resultString[i] === '}') {
      currentDepth--;
      if (currentDepth === 0 && currentStart !== -1) {
        try {
          const candidate = resultString.slice(currentStart, i + 1);
          objects.push(JSON.parse(candidate));
        } catch (e) {
          // If a full parse fails but it looks like a valid object, try to clean it
        }
      }
    }
  }

  // Prioritize the "meatier" object (the one with scenes or composition data)
  const projectObject = objects.find(obj => 
    obj.type === 'composition' || 
    obj.scenes || 
    obj.project || 
    obj.project_script
  );
  
  if (projectObject) return projectObject;

  // If no project object found, but we have a chat message, use that
  const chatObject = objects.find(obj => obj.message || obj.content);
  if (chatObject) return chatObject;
  
  // Last resort: If we have multiple objects, return the largest one
  if (objects.length > 0) {
    return objects.sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
  }

  // Final Fallback: Try to parse the raw string as JSON (ignoring garbage)
  try {
    const firstBrace = resultString.indexOf('{');
    const lastBrace = resultString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(resultString.slice(firstBrace, lastBrace + 1));
    }
  } catch (e) {}

  return { message: "I couldn't process that project. It might have been too long or malformed." };
}
