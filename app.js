
//import { ESPLoader } from "https://cdn.jsdelivr.net/gh/adafruit/Adafruit_WebSerial_ESPTool@latest/dist/web/index.js";

document.addEventListener("DOMContentLoaded", () => {
    const connectButton = document.getElementById("connectButton");
    const flashButton = document.getElementById("flashButton");
    const binaryFileInput = document.getElementById("binaryFile");
    const status = document.getElementById("status");

    const firmware = document.querySelectorAll(".upload .firmware input");

    const baudRates = [921600, 115200, 230400, 460800];
    const bufferSize = 512;
    const measurementPeriodId = "0001";

    //const offsets = document.querySelectorAll(".upload .offset");

    const offsets = 0;


    let esploader;
    let binaryFile;
    let espStub;

    // Handle file selection
    binaryFileInput.addEventListener("change", (event) => {
        binaryFile = event.target.files[0];
        if (binaryFile) {
            status.textContent = `Selected file: ${binaryFile.name}`;
        }
    });

    function logMsg(text) {
    console.log(text);
    }

    function debugMsg(...args) {
      function getStackTrace() {
        let stack = new Error().stack;
        //console.log(stack);
        stack = stack.split("\n").map((v) => v.trim());
        stack.shift();
        stack.shift();

        let trace = [];
        for (let line of stack) {
          line = line.replace("at ", "");
          trace.push({
            func: line.substr(0, line.indexOf("(") - 1),
            pos: line.substring(line.indexOf(".js:") + 4, line.lastIndexOf(":")),
          });
        }

        return trace;
      }

      let stack = getStackTrace();
      stack.shift();
      let top = stack.shift();
      let prefix =
        '<span class="debug-function">[' + top.func + ":" + top.pos + "]</span> ";
      for (let arg of args) {
        if (arg === undefined) {
          logMsg(prefix + "undefined");
        } else if (arg === null) {
          logMsg(prefix + "null");
        } else if (typeof arg == "string") {
          logMsg(prefix + arg);
        } else if (typeof arg == "number") {
          logMsg(prefix + arg);
        } else if (typeof arg == "boolean") {
          logMsg(prefix + (arg ? "true" : "false"));
        } else if (Array.isArray(arg)) {
          logMsg(prefix + "[" + arg.map((value) => toHex(value)).join(", ") + "]");
        } else if (typeof arg == "object" && arg instanceof Uint8Array) {
          logMsg(
            prefix +
              "[" +
              Array.from(arg)
                .map((value) => toHex(value))
                .join(", ") +
              "]"
          );
        } else {
          logMsg(prefix + "Unhandled type of argument:" + typeof arg);
          console.log(arg);
        }
        prefix = ""; // Only show for first argument
      }
    }

    function errorMsg(text) {
    console.error(text);
    }

    function formatMacAddr(macAddr) {
      return macAddr
        .map((value) => value.toString(16).toUpperCase().padStart(2, "0"))
        .join(":");
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Erase ESP32
    eraseButton.addEventListener("click", async () => {
      if (
        window.confirm("This will erase the entire flash. Click OK to continue.")
      ) {

        try {
          logMsg("Erasing flash memory. Please wait...");
          let stamp = Date.now();
          await espStub.eraseFlash();
          logMsg("Finished. Took " + (Date.now() - stamp) + "ms to erase.");
        } catch (e) {
          errorMsg(e);
        } finally {

        }
      }
    });

    // Connect to the ESP32
    connectButton.addEventListener("click", async () => {
          if (espStub) {
            await espStub.disconnect();
            await espStub.port.close();
            espStub = undefined;
            return;
          }
          const esploaderMod = await window.esptoolPackage;

          const esploader = await esploaderMod.connect({
            log: (...args) => logMsg(...args),
            debug: (...args) => debugMsg(...args),
            error: (...args) => errorMsg(...args),
          });

          try {
            await esploader.initialize();

            logMsg("Connected to " + esploader.chipName);
            logMsg("MAC Address: " + formatMacAddr(esploader.macAddr()));

            espStub = await esploader.runStub();

            espStub.addEventListener("disconnect", () => {
              espStub = false;
            });
          } catch (err) {
            await esploader.disconnect();
            throw err;
          }

/*        try {
            status.textContent = "Requesting device...";
            const device = await navigator.serial.requestPort();

            if (!device) {
                throw new Error("No device selected.");
            }

            status.textContent = "Initializing connection...";
            esploader = new ESPLoader(device, { debug: true });

            await esploader.initialize();
            status.textContent = "Connected to ESP32!";
            flashButton.disabled = false;
        } catch (error) {
            status.textContent = `Connection failed: ${error.message}`;
          }
*/
    });






    flashButton.addEventListener("click", async () => {
    if (!binaryFile) {
        status.textContent = "No file selected!";
        return;
    }

    try {
        const offset = 0x0000; // Hardcoded offset for the merged file
        status.textContent = "Preparing to flash...";

        // Read the binary file into an ArrayBuffer
        const fileArrayBuffer = await readUploadedFileAsArrayBuffer(binaryFile);
        console.log("Flashing file size:", fileArrayBuffer.byteLength);

        // Flash the entire file
        status.textContent = "Flashing started...";
        const startTime = Date.now(); // Track flashing time
        await espStub.flashData(
            new Uint8Array(fileArrayBuffer), // Entire file as Uint8Array
            (bytesWritten, totalBytes) => { // Progress callback
                const percentage = (bytesWritten / totalBytes) * 100;
                console.log(`Flashing progress: ${percentage.toFixed(2)}%`);
                status.textContent = `Flashing: ${percentage.toFixed(2)}% completed`;
            },
            offset // Flash at 0x0000
        );

        // Finalize the flashing process
        await espStub.flashFinish();

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`Flashing complete! Took ${duration}ms to write ${fileArrayBuffer.byteLength} bytes.`);
        status.textContent = `Flashing complete! Took ${duration}ms.`;
    } catch (error) {
        console.error("Flashing failed:", error);
        status.textContent = `Flashing failed: ${error?.message || error || "Unknown error"}`;
    }
});

// Helper function to read the binary file as an ArrayBuffer
async function readUploadedFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
    });
}














/*
    flashButton.addEventListener("click", async () => {
      const fileArrayBuffer = await binaryFile.arrayBuffer();
      let contents = new Uint8Array(fileArrayBuffer);
        let binfile = 1;
      //  let contents = await readUploadedFileAsArrayBuffer(binfile);
        let offsetadd = 0;
        try {
          let offset = parseInt(offsetadd, 16);

          await espStub.flashData(
            contents,
            (bytesWritten, totalBytes) => {
            //  progressBar.style.width =
            //    Math.floor((bytesWritten / totalBytes) * 100) + "%";
            },
            offset
          );
          await sleep(100);
        } catch (e) {
          errorMsg(e);
        }

      logMsg("To run the new firmware, please reset your device.");
    });
*/

/*
    // Flash the ESP32
    flashButton.addEventListener("click", async () => {
        if (!binaryFile) {
            status.textContent = "No file selected!";
            return;
        }

        try {
            status.textContent = "Preparing to flash...";
            //const offset = 0x000; // Fixed offset
            const offsets = 0;
            let offset = parseInt(0, 16);
            const fileArrayBuffer = await binaryFile.arrayBuffer();

            status.textContent = "Flashing started...";
            await espStub.flashData(
              new Uint8Array(fileArrayBuffer),
              (bytesWritten, totalBytes) => {
          //  await espStub.flashData(new Uint8Array(fileArrayBuffer), offset, (percentage) => {
          //  status.textContent = `Flashing: ${percentage.toFixed(2)}% completed`;
          //  });
          },
            offset
          );

            await sleep(100);
            status.textContent = "Flashing successful!";
        } catch (error) {
            //status.textContent = `Flashing failed: ${error.message}`;
            //errorMsg(error);
            //console.log(erro.message);

           } finally {
        }
    });
*/

});
