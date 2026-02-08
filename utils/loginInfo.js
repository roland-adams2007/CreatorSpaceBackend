const UAParser = require("ua-parser-js");

function getDeviceInfo(userAgent) {
  try {
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name || "Unknown Browser";
    const os = parser.getOS().name || "Unknown OS";

    return `${browser} on ${os}`;
  } catch (error) {
    console.error("Device info parsing failed:", error);
    return "Unknown Device";
  }
}

async function getLocation(ip) {
  try {
    if (!ip) return "Unknown";

    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();

    if (data.error) return "Unknown";

    return `${data.city || "Unknown"}, ${data.country_name || "Unknown"}`;
  } catch (error) {
    console.error("Location lookup failed:", error);
    return "Unknown";
  }
}

module.exports = {
  getDeviceInfo,
  getLocation,
};
