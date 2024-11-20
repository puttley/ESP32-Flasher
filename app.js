
//import { ESPLoader } from "https://cdn.jsdelivr.net/gh/adafruit/Adafruit_WebSerial_ESPTool@latest/dist/web/index.js";

document.addEventListener("DOMContentLoaded", () => {
    const connectButton = document.getElementById("connectButton");
    const flashButton = document.getElementById("flashButton");
    const binaryFileInput = document.getElementById("binaryFile");
    const status = document.getElementById("status");

    const firmware = document.querySelectorAll(".upload .firmware input");

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

    function debugMsg(text) {
    console.log(text);
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
