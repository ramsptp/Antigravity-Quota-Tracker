const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Path to the PowerShell script
const SCRIPT_PATH = path.join(__dirname, 'fetch_quota.ps1');

app.get('/api/quota', (req, res) => {
    // Execute the PowerShell script
    exec(`powershell -ExecutionPolicy Bypass -File "${SCRIPT_PATH}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error}`);
            return res.status(500).json({ error: 'Server Error', message: error.message });
        }
        
        try {
            // The script output should be a JSON string
            const data = JSON.parse(stdout.trim());
            res.json(data);
        } catch (parseError) {
            console.error(`JSON Parse Error: ${parseError}`);
            console.error(`Raw Output: ${stdout}`);
            res.status(500).json({ error: 'Parse Error', message: 'Failed to parse script output', raw: stdout });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
