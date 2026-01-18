async function listModels() {
    const key = 'AIzaSyC74h6iYgCJiKmQzZvbksDhaX3497kqWsc'; // From .env
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            const geminiModels = data.models
                .filter(m => m.name.includes('gemini'))
                .map(m => m.name);
            console.log(JSON.stringify(geminiModels, null, 2));
        } else {
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error(error);
    }
}

listModels();
