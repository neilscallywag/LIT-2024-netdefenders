function createBanner(isPhishing) {
  const existingBanner = document.getElementById("phishing-alert-banner");
  if (existingBanner) return; 
  

  console.log("Creating phishing alert banner.");

  const banner = document.createElement("div");
  banner.id = "phishing-alert-banner";
  banner.style.position = "fixed";
  banner.style.top = "10px";
  banner.style.right = "10px";
  banner.style.zIndex = "10000";
  banner.style.backgroundColor = isPhishing ? "#f44336" : "#4CAF50"; // Red for phishing, green for safe
  banner.style.color = "white";
  banner.style.padding = "10px";
  banner.style.borderRadius = "5px";
  banner.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
  banner.style.display = "flex";
  banner.style.alignItems = "center";
  banner.style.cursor = "pointer";

  const text = document.createElement("span");
  text.innerText = isPhishing
    ? "Warning: This site may be a phishing site!"
    : "This website is safe.";

  const closeButton = document.createElement("span");
  closeButton.innerText = "✖";
  closeButton.style.marginLeft = "10px";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = () => {
    document.body.removeChild(banner);
  };

  banner.appendChild(text);
  banner.appendChild(closeButton);

  document.body.appendChild(banner);
  console.log("Banner created and displayed.");
}

function createSafetyIcon(isPhishing) {
  console.log("Creating safety icon with isPhishing:", isPhishing);

  const existingIcon = document.getElementById("safety-icon");
  if (existingIcon) return;

  const icon = document.createElement("div");
  icon.id = "safety-icon";
  icon.style.position = "fixed";
  icon.style.bottom = "10px";
  icon.style.right = "10px";
  icon.style.width = "40px";
  icon.style.height = "40px";
  icon.style.borderRadius = "50%";
  icon.style.backgroundColor = isPhishing ? "#f44336" : "#4CAF50"; // Red for phishing, green for safe
  icon.style.display = "flex";
  icon.style.justifyContent = "center";
  icon.style.alignItems = "center";
  icon.style.color = "white";
  icon.style.fontSize = "24px";
  icon.style.cursor = "pointer";
  icon.title = isPhishing
    ? "Warning: This site may be a phishing site!"
    : "This website is safe.";

  icon.innerHTML = isPhishing ? "⚠️" : "✔️";

  icon.onmouseenter = () => {
    const hoverText = document.createElement("div");
    hoverText.id = "safety-hover-text";
    hoverText.innerText = isPhishing
      ? "Warning: This site may be a phishing site!"
      : "This website is safe.";
    hoverText.style.position = "fixed";
    hoverText.style.bottom = "60px";
    hoverText.style.right = "10px";
    hoverText.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    hoverText.style.color = "white";
    hoverText.style.padding = "5px 10px";
    hoverText.style.borderRadius = "5px";
    hoverText.style.zIndex = "10001";
    document.body.appendChild(hoverText);
  };

  icon.onmouseleave = () => {
    const hoverText = document.getElementById("safety-hover-text");
    if (hoverText) {
      document.body.removeChild(hoverText);
    }
  };

  document.body.appendChild(icon);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received from background script:", message);

  if (message.isPhishing) {
    createBanner(true);
    createSafetyIcon(true);
  } else {
    createBanner(false);
    createSafetyIcon(false);
  }
});
