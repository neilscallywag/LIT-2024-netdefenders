chrome.runtime.onInstalled.addListener(() => {
  console.log("Phishing Detector extension installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log(`Checking URL: ${tab.url}`);
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: () => document.documentElement.innerHTML,
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const sourceCode = results[0].result;
          console.log("Source code length:", sourceCode.length);
          checkPhishing(tab.url, sourceCode);
        }
      }
    );
  }
});

function checkPhishing(url, sourceCode) {
  console.log(`Checking site: ${url}`);

  const sourceCodeBase64 = btoa(unescape(encodeURIComponent(sourceCode)));
  console.log("Source code converted to Base64.");

  const userDeviceInfo = navigator.userAgent;
  const apiUrl = `http://test.com/api?key=${encodeURIComponent(
    userDeviceInfo
  )}`;

  // Mocking the fetch response
  setTimeout(() => {
    const mockResponse = { phishing: false };

    console.log("Mocked response from backend:", mockResponse);

    if (mockResponse.phishing) {
      console.log("Phishing detected! Notifying content script.");

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { isPhishing: true });
      });
    } else {
      console.log("No phishing detected.");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { isPhishing: false });
      });
    }
  }, 1000);
  /*
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceCode: sourceCodeBase64, url }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Response from backend:", data);
  
        if (data.phishing) {
          console.log("Phishing detected! Notifying content script.");
  
          // Send a message to the content script indicating that this is a phishing site
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { isPhishing: true });
          });
        } else {
          console.log("No phishing detected.");
        }
      })
      .catch((error) => console.error("Error contacting backend:", error));
    */
}
