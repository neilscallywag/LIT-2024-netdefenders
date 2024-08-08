// Function to create and inject CSS styles into the document
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .phishing-link-ext {
      background-color: yellow; /* Highlight phishing links */
      position: relative;
    }

    .phishing-popup-ext {
      display: none;
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      background-color: white;
      padding: 20px;
      border: 1px solid #d9534f;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .phishing-popup-ext.visible {
      display: block;
    }

    .phishing-popup-ext .popup-content {
      text-align: left;
    }

    .phishing-popup-ext .popup-content img {
      width: 20px;
      height: 20px;
      vertical-align: middle;
      margin-right: 10px;
    }

    .phishing-popup-ext .popup-content .phishing-link-address {
      display: block;
      margin-top: 10px;
      font-size: 0.9em;
      color: #333;
    }

    .phishing-popup-ext .popup-buttons {
      margin-top: 20px;
      text-align: right;
    }

    .phishing-popup-ext .popup-buttons button {
      padding: 5px 10px;
      margin-left: 10px;
    }

    .phishing-popup-backdrop {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
    }

    .phishing-popup-backdrop.visible {
      display: block;
    }
  `;
  document.head.appendChild(style);
}

// Call the injectStyles function to ensure styles are added
injectStyles();

function createPopup(link) {
  const backdrop = document.createElement("div");
  backdrop.className = "phishing-popup-backdrop";

  const popup = document.createElement("div");
  popup.className = "phishing-popup-ext";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-labelledby", "phishing-warning-title");
  popup.setAttribute("aria-modal", "true");

  const popupContent = document.createElement("div");
  popupContent.className = "popup-content";

  const icon = document.createElement("img");
  icon.src = "https://img.icons8.com/color/48/000000/warning-shield.png";
  icon.alt = "Phishing warning icon";

  const text = document.createElement("span");
  text.innerText =
    "Caution: This link may be a phishing site. Do you want to continue?";

  const linkAddress = document.createElement("span");
  linkAddress.className = "phishing-link-address";
  linkAddress.innerText = `Link: ${link}`;

  const infoLink = document.createElement("a");
  infoLink.innerText = " Learn more";
  infoLink.href = "https://www.antiphishing.org/resources/overview/";
  infoLink.target = "_blank";
  infoLink.style.color = "blue";
  infoLink.style.textDecoration = "underline";
  infoLink.setAttribute(
    "aria-label",
    "Learn more about phishing. Click to read more."
  );

  const buttons = document.createElement("div");
  buttons.className = "popup-buttons";

  const proceedButton = document.createElement("button");
  proceedButton.innerText = "Proceed";
  proceedButton.onclick = () => {
    window.location.href = link;
  };

  const cancelButton = document.createElement("button");
  cancelButton.innerText = "Cancel";
  cancelButton.onclick = () => {
    popup.classList.remove("visible");
    backdrop.classList.remove("visible");
  };

  backdrop.onclick = () => {
    popup.classList.remove("visible");
    backdrop.classList.remove("visible");
  };

  buttons.appendChild(proceedButton);
  buttons.appendChild(cancelButton);

  popupContent.appendChild(icon);
  popupContent.appendChild(text);
  popupContent.appendChild(linkAddress);
  popupContent.appendChild(infoLink);
  popup.appendChild(popupContent);
  popup.appendChild(buttons);

  document.body.appendChild(popup);
  document.body.appendChild(backdrop);

  return { popup, backdrop };
}

function highlightPhishingLinks(links) {
  links.forEach(([link, isPhishing]) => {
    if (isPhishing) {
      const elements = document.querySelectorAll(`a[href='${link}']`);
      elements.forEach((element) => {
        if (!element.getAttribute("data-phishing-popup-created")) {
          element.classList.add("phishing-link-ext");
          element.setAttribute(
            "aria-label",
            "Phishing link. Click with caution."
          );
          element.setAttribute("data-phishing-popup-created", "true");

          const { popup, backdrop } = createPopup(link);

          element.addEventListener("click", (event) => {
            event.preventDefault();
            popup.classList.add("visible");
            backdrop.classList.add("visible");
          });
        }
      });
    }
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received from background script:", message);

  if (message.links) {
    highlightPhishingLinks(message.links);
  }
});
