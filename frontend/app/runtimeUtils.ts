export async function* parseSSEStream(response: Response) {
    if (!response.body) {
      throw new Error("No response body");
    }
  
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
  
    try {
      while (true) {
        const { done, value } = await reader.read();
  
        if (done) {
          break;
        }
  
        const chunk = decoder.decode(value, { stream: true });
  
        const lines = chunk.split("\n");
  
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonPart = line.slice(6);
  
            try {
              const data = JSON.parse(jsonPart);
  
              if (data.content) {
                yield { type: "content", data: data.content };
              } else if (data.type === "metadata") {
                yield { type: "metadata", data: data };
              } else if (data.done) {
                return;
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }