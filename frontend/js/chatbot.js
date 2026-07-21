document.addEventListener("DOMContentLoaded", () => {

  // Chat Button
  const button = document.createElement("button");
  button.innerHTML = "💬";

  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.width = "60px";
  button.style.height = "60px";
  button.style.borderRadius = "50%";
  button.style.border = "none";
  button.style.background = "#d32f2f";
  button.style.color = "white";
  button.style.fontSize = "24px";
  button.style.cursor = "pointer";
  button.style.zIndex = "9999";

  document.body.appendChild(button);

  // Chat Window
  const chatWindow = document.createElement("div");

  chatWindow.style.position = "fixed";
  chatWindow.style.bottom = "90px";
  chatWindow.style.right = "20px";
  chatWindow.style.width = "320px";
  chatWindow.style.height = "400px";
  chatWindow.style.background = "white";
  chatWindow.style.border = "1px solid #ddd";
  chatWindow.style.borderRadius = "10px";
  chatWindow.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
  chatWindow.style.display = "none";
  chatWindow.style.zIndex = "9999";

  chatWindow.innerHTML = `
    <div style="background:#d32f2f;color:white;padding:10px;font-weight:bold;">
      Blood Bank Assistant
    </div>

    <div id="chatMessages"
         style="height:280px;padding:10px;overflow-y:auto;">
      <p><b>Bot:</b> Hello! How can I help you?</p>

<p><b>Try:</b></p>

<ul>
  <li>A+</li>
  <li>O+</li>
  <li>blood bank</li>
  <li>donate blood</li>
</ul>
    </div>

    <div style="padding:10px;border-top:1px solid #ddd;">
      <input
        type="text"
        id="chatInput"
        placeholder="Type your message..."
        style="width:70%;padding:8px;"
      />

      <button
        id="sendBtn"
        style="
          padding:8px 12px;
          background:#d32f2f;
          color:white;
          border:none;
          cursor:pointer;
        "
      >
        Send
      </button>
    </div>
  `;

  document.body.appendChild(chatWindow);

  // Toggle Chat Window
  button.addEventListener("click", () => {

    if(chatWindow.style.display === "none"){
      chatWindow.style.display = "block";
    } else {
      chatWindow.style.display = "none";
    }

  });

  // Send Message
  const input =
  chatWindow.querySelector("#chatInput");

input.addEventListener("keypress", (e) => {

  if(e.key === "Enter"){

    sendBtn.click();

  }

});

  sendBtn.addEventListener("click", async () => {
    const sendBtn =
      chatWindow.querySelector("#sendBtn");

    const input =
      chatWindow.querySelector("#chatInput");

    const messages =
      chatWindow.querySelector("#chatMessages");

    const userMessage =
      input.value.trim();

    if(!userMessage) return;

    // User Message
    messages.innerHTML +=
      `<p><b>You:</b> ${userMessage}</p>`;
 // Bot Reply
    let botReply = "";
  if (userMessage.toLowerCase().startsWith("find ")) {

  let bloodGroup =
  userMessage.substring(5).trim().toUpperCase();

if (bloodGroup === "A+") bloodGroup = "A+ve";
if (bloodGroup === "A-") bloodGroup = "A-ve";
if (bloodGroup === "B+") bloodGroup = "B+ve";
if (bloodGroup === "B-") bloodGroup = "B-ve";
if (bloodGroup === "AB+") bloodGroup = "AB+ve";
if (bloodGroup === "AB-") bloodGroup = "AB-ve";
if (bloodGroup === "O+") bloodGroup = "O+ve";
if (bloodGroup === "O-") bloodGroup = "O-ve";

  const state =
    document.getElementById("state").value;

  const district =
    document.getElementById("district").value;

  const city =
    document.getElementById("city").value;

  const emergencyLevel =
    document.getElementById("emergencyLevel").value;

  const unitsRequired =
    document.getElementById("unitsRequired").value;

  try {

    const data = await apiRequest("/search", {
      method: "POST",
      auth: true,
      body: {
        bloodGroup,
        state,
        district,
        city,
        emergencyLevel,
        unitsRequired
      }
    });
    console.log(data);
    if (data.bloodBanks && data.bloodBanks.length > 0) {

  botReply =
  `🏆 BEST BLOOD BANK MATCHES\n\n` +
  `🏥 Found ${data.bloodBanks.length} Blood Banks\n\n`;
 data.bloodBanks.slice(0, 2).forEach((bank, index) => {

  botReply +=
    `${index + 1}. ${bank.name}\n` +
    `📍 ${bank.city}\n` +
    `📞 ${bank.contact || bank.phone || "N/A"}\n\n`;

});
  botReply +=
  `\n👥 Matching Donors: ${data.suggestedDonors.length}`;

} else {

  botReply = "No blood banks found.";

}

  } catch (err) {

    botReply = "Search failed. Please try again.";

  }

}
else if (userMessage.toLowerCase().includes("a+")) {
botReply =
  "A+ can receive blood from A+, A-, O+, O-";

}
else if (userMessage.toLowerCase().includes("o+")) {

  botReply =
  "O+ can receive blood from O+ and O-";

}
else if (userMessage.toLowerCase().includes("ab+")) {

  botReply =
  "AB+ is universal recipient.";

}
else if (userMessage.toLowerCase().includes("donate")) {

  botReply =
  "Healthy adults can usually donate blood every few months.";

}
else if (userMessage.toLowerCase().includes("blood bank")) {

  botReply =
  "Use the search filters above to find nearby blood banks.";

}
else {

  botReply =
  "Please ask about blood groups, blood banks, donors, or blood donation.";

}

messages.innerHTML += `
  <div style="margin-top:8px;">
    <b>Bot:</b><br>
    ${botReply.replace(/\n/g, "<br>")}
  </div>
`;

    input.value = "";

    // Auto Scroll
    messages.scrollTop =
      messages.scrollHeight;

});

});