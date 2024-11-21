let espStub;

const baudRates = [921600, 115200, 230400, 460800];
const bufferSize = 512;
const maxLogLength = 100;
const log = document.getElementById("log");
const butConnect = document.getElementById("butConnect");
const baudRate = document.getElementById("baudRate");
const butClear = document.getElementById("butClear");
const butErase = document.getElementById("butErase");
const butProgram = document.getElementById("butProgram");
const autoscroll = document.getElementById("autoscroll");
const firmware = document.querySelectorAll(".upload .firmware input");
const offsets = document.querySelectorAll(".upload .offset");
const appDiv = document.getElementById("app");
const status = document.getElementById("status");

document.addEventListener("DOMContentLoaded", () => {
  butConnect.addEventListener("click", () => {
    clickConnect().catch(async (e) => {
      console.error(e);
      errorMsg(e.message || e);
      if (espStub) {
        await espStub.disconnect();
      }
      toggleUIConnected(false);
    });
  });
  butClear.addEventListener("click", clickClear);
  butErase.addEventListener("click", clickErase);
  butProgram.addEventListener("click", clickProgram);
  for (let i = 0; i < firmware.length; i++) {
    firmware[i].addEventListener("change", checkFirmware);
  }
  for (let i = 0; i < offsets.length; i++) {
    offsets[i].addEventListener("change", checkProgrammable);
  }
  autoscroll.addEventListener("click", clickAutoscroll);
  baudRate.addEventListener("change", changeBaudRate);

  window.addEventListener("error", function (event) {
    console.log("Got an uncaught error: ", event.error);
  });


  initBaudRate();
  loadAllSettings();
  logMsg("ESP Web Flasher loaded.");
});

/**
 * @name checkProgrammable
 * Check if the conditions to program the device are sufficient
 */
async function checkProgrammable() {
  butProgram.disabled = getValidFiles().length == 0;
  //butProgram.disabled = false;
}

/**
 * @name checkFirmware
 * Handler for firmware upload changes
 */
async function checkFirmware(event) {
  let filename = event.target.value.split("\\").pop();
  let label = event.target.parentNode.querySelector("span");
  let icon = event.target.parentNode.querySelector("svg");
  await checkProgrammable();
}

async function changeBaudRate() {
  saveSetting("baudrate", baudRate.value);
  if (espStub) {
    let baud = parseInt(baudRate.value);
    if (baudRates.includes(baud)) {
      await espStub.setBaudrate(baud);
    }
  }
}

function initBaudRate() {
  for (let rate of baudRates) {
    const option = document.createElement("option");
    option.text = rate + " Baud";
    option.value = rate;
    baudRate.add(option);
  }
}

function logMsg(text) {
  log.innerHTML += text + "<br>";
  if (log.textContent.split("\n").length > maxLogLength + 1) {
    let logLines = log.innerHTML.replace(/(\n)/gm, "").split("<br>");
    log.innerHTML = logLines.splice(-maxLogLength).join("<br>\n");
  }
  if (autoscroll.checked) {
    log.scrollTop = log.scrollHeight;
  }
}

function errorMsg(text) {
  logMsg('<span class="error-message">Error:</span> ' + text);
  console.error(text);
}

async function clickConnect() {
  if (espStub) {
    await espStub.disconnect();
    await espStub.port.close();
    toggleUIConnected(false);
    espStub = undefined;
    butErase.disabled = true;
    butProgram.disabled = true;
    status.textContent = "               ";
    return;
  }

  const esploaderMod = await window.esptoolPackage;

  const esploader = await esploaderMod.connect({
    log: (...args) => logMsg(...args),
    error: (...args) => errorMsg(...args),
  });

  try {
    await esploader.initialize();
    logMsg("Connected to " + esploader.chipName);
    logMsg("MAC Address: " + esploader.macAddr());
    butErase.disabled = false;

    checkProgrammable();

    espStub = await esploader.runStub();
    toggleUIConnected(true);
    espStub.addEventListener("disconnect", () => {
      toggleUIConnected(false);
      espStub = false;
    });
  } catch (err) {
    await esploader.disconnect();
    status.textContent = "               ";
    throw err;
  }
}

async function clickErase() {
  if (window.confirm("This will erase the entire flash. Click OK to continue.")) {
    try {
      logMsg("Erasing flash memory...");
      await espStub.eraseFlash();
      logMsg("Erase completed.");
    } catch (e) {
      errorMsg(e);
    }
  }
}

async function clickProgram() {
  const readUploadedFileAsArrayBuffer = (inputFile) => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onerror = () => {
        reader.abort();
        reject(new DOMException("Problem parsing input file."));
      };

      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsArrayBuffer(inputFile);
    });
  };

  baudRate.disabled = true;
  butErase.disabled = true;
  butProgram.disabled = true;
  butConnect.disabled = true;

  for (let i = 0; i < firmware.length; i++) {
    firmware[i].disabled = true;
    offsets[i].disabled = true;
  }

  for (let file of getValidFiles()) {
    let binfile = firmware[file].files[0];
    let contents = await readUploadedFileAsArrayBuffer(binfile);
    try {
      let offset = parseInt(offsets[file].value, 16);
      await espStub.flashData(
        contents,
        (bytesWritten, totalBytes) => {
          status.textContent = `Flash Progress: ${Math.floor((bytesWritten / totalBytes) * 100) + "%"}`;
        },
        offset
      );
    } catch (e) {
      errorMsg(e);
    }
  }

  for (let i = 0; i < firmware.length; i++) {
    firmware[i].disabled = false;
    offsets[i].disabled = false;
  }

  butErase.disabled = false;
  butProgram.disabled = false;
  baudRate.disabled = false;
  butConnect.disabled = false;
  logMsg("Disconnecting device......");
  await sleep(1000);               // just a pause....before disconnecting
  await espStub.disconnect();     // dont have to auto disconnect, but it keeps a reset from
  await espStub.port.close();     // disconnecting improperly, therefore having to refresh the app to reconnect.
  toggleUIConnected(false);
  espStub = undefined;
  logMsg("To run the new firmware, please reset your device.");
}

function getValidFiles() {
  let validFiles = [];
  let offsetVals = [];
  for (let i = 0; i < offsets.length; i++) {
    if (i < firmware.length && firmware[i].files.length > 0) {
      let offs = parseInt(offsets[i].value, 16);
      if (!offsetVals.includes(offs)) {
        validFiles.push(i);
        offsetVals.push(offs);
      }
    }
  }
  return validFiles;
}

async function clickAutoscroll() {
  saveSetting("autoscroll", autoscroll.checked);
}

async function clickClear() {
  log.innerHTML = "";
}

function toggleUIConnected(connected) {
  butConnect.textContent = connected ? "Disconnect" : "Connect";
}

function loadAllSettings() {
  autoscroll.checked = loadSetting("autoscroll", true);
  baudRate.value = loadSetting("baudrate", 921600);
}

function loadSetting(setting, defaultValue) {
  let value = JSON.parse(window.localStorage.getItem(setting));
  return value == null ? defaultValue : value;
}

function saveSetting(setting, value) {
  window.localStorage.setItem(setting, JSON.stringify(value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
