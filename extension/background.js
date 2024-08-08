chrome.runtime.onInstalled.addListener(() => {
  console.log("Phishing Detector extension installed");
  updateWhitelist();
  setInterval(updateWhitelist, 3600000); // Update every hour
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log(`Checking URL: ${tab.url}`);
    const whitelist = await getWhitelist();
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: parseAndCheckLinks,
        args: [whitelist],
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const links = results[0].result;
          console.log("Collected links:", links);
          checkLinks(links, tabId);
        }
      }
    );
  }
});

function getWhitelist() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["whitelist"], (result) => {
      resolve(result.whitelist || []);
    });
  });
}

function parseAndCheckLinks(whitelist = []) {
  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((link) => link.href)
    .filter((href) => {
      const hostname = new URL(href).hostname;
      return (
        hostname !== window.location.hostname && !whitelist.includes(hostname)
      );
    });

  return links;
}

function checkLinks(links, tabId) {
  console.log(`Checking links: ${links}`);

  const apiUrl = "http://localhost:5001/predict";
  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ links }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Response from backend:", data);
      chrome.tabs.sendMessage(tabId, { links: data.links });
    })
    .catch((error) => console.error("Error contacting backend:", error));
}

function updateWhitelist() {
  const whitelist = []; // Initialize the whitelist variable
  console.log("invoked get whitelist");

  const whitelistUrl = "http://localhost:5001/whitelist";

  fetch(whitelistUrl)
    .then((response) => response.json())
    .then((data) => {
      chrome.storage.local.set({ whitelist: data.links }, () => {
        console.log("Whitelist updated:", data.links);
      });
    })
    .catch((error) => console.error("Error updating whitelist:", error));
}
