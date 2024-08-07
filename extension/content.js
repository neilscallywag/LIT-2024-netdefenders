function createBanner() {
  console.log("Creating phishing alert banner.");

  const banner = document.createElement("div");
  banner.id = "phishing-alert-banner";
  banner.style.position = "fixed";
  banner.style.top = "10px";
  banner.style.right = "10px";
  banner.style.zIndex = "10000";
  banner.style.backgroundColor = "#f44336";
  banner.style.color = "white";
  banner.style.padding = "10px";
  banner.style.borderRadius = "5px";
  banner.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
  banner.innerText = "Warning: This site may be a phishing site!";

  document.body.appendChild(banner);
  console.log("Banner created and displayed.");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received from background script:", message);

  if (message.isPhishing) {
    createBanner();
  }
});
