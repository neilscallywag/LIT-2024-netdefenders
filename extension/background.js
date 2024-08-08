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

  // Mocking the fetch response
  setTimeout(() => {
    const mockResponse = links.map((link) => [link, Math.random() < 0.5]);

    console.log("Mocked response from backend:", mockResponse);

    chrome.tabs.sendMessage(tabId, { links: mockResponse });
  }, 1000);
  /*
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
        chrome.tabs.sendMessage(tabId, { links: data });
      })
      .catch((error) => console.error("Error contacting backend:", error));
    */
}

function updateWhitelist() {
  console.log("invoked get whitelist");
  // Example whitelist data for testing purposes
  const whitelist = ["example.com", "google.com"];

  chrome.storage.local.set({ whitelist }, () => {
    console.log("Whitelist updated:", whitelist);
  });

  // Uncomment the following lines to fetch the whitelist from a remote URL
  /*
  const whitelistUrl = "https://example.com/whitelist";

  fetch(whitelistUrl)
    .then((response) => response.json())
    .then((data) => {
      chrome.storage.local.set({ whitelist: data }, () => {
        console.log("Whitelist updated:", data);
      });
    })
    .catch((error) => console.error("Error updating whitelist:", error));
  */
}
