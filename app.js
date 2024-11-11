let port;
let esptool;

// Import ESPTool directly from the module
// import { ESPTool } from 'https://unpkg.com/esptool-js/bundle.js';

// Dynamically load bundle.js as a module
import('https://unpkg.com/esptool-js/bundle.js')
    .then((module) => {
        // Check if ESPTool is available on the global window object
        const ESPTool = window.ESPTool;
        if (ESPTool) {
            console.log("ESPTool loaded successfully:", ESPTool);
            // Now you can use ESPTool here as expected
        } else {
            console.error("ESPTool is not available.");
        }
    })
    .catch((error) => {
        console.error("Failed to load ESPTool:", error);
    });

console.log("ESPTool is:", ESPTool);

document.getElementById("connectButton").addEventListener("click", async () => {
    const logArea = document.getElementById("logArea");

    try {
        // Request a serial port and open a connection
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        // Initialize esptool after connection
        esptool = new ESPTool(port);
        await esptool.initialize();

        logArea.textContent = "Connected to ESP32-S3. Please select the binary files.";

    } catch (error) {
        logArea.textContent = `Connection error: ${error.message}`;
    }
});

document.getElementById("binaryFiles").addEventListener("change", async () => {
    const logArea = document.getElementById("logArea");
    const progressBar = document.getElementById("progressBar");
    const binaryFiles = document.getElementById("binaryFiles").files;

    // Ensure user has selected exactly four files
    if (binaryFiles.length !== 4) {
        logArea.textContent = "Please select all four binary files.";
        return;
    }

    if (!port || !esptool) {
        logArea.textContent = "Please connect to the ESP32-S3 first.";
        return;
    }

    const fileAddresses = {
        "bootloader.bin": 0x1000,
        "partition-table.bin": 0x8000,
        "application.bin": 0x10000,
        "spiffs.bin": 0x290000
    };

    logArea.textContent = "Starting flash...";

    try {
        // Flash each file to its respective address
        for (let file of binaryFiles) {
            const data = await file.arrayBuffer();
            const address = fileAddresses[file.name];

            if (address === undefined) {
                logArea.textContent += `\nError: Unrecognized file ${file.name}.`;
                continue;
            }

            logArea.textContent += `\nFlashing ${file.name} to address 0x${address.toString(16)}...`;

            // Flash the binary file to the specific address
            await esptool.flashData(new Uint8Array(data), (percent) => {
                progressBar.value = percent;
            }, address);
        }

        logArea.textContent += "\nFlash complete!";
    } catch (error) {
        logArea.textContent = `Error during flash: ${error.message}`;
    }
});
