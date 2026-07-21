// js/login.js

const mobileForm = document.getElementById("mobileForm");
const otpForm = document.getElementById("otpForm");
const alertBox = document.getElementById("alertBox");
const mobileInput = document.getElementById("mobile");
const otpInput = document.getElementById("otp");
const otpMobileLabel = document.getElementById("otpMobileLabel");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const changeNumberBtn = document.getElementById("changeNumberBtn");
const resendOtpBtn = document.getElementById("resendOtpBtn");

let currentMobile = "";

// If already logged in, skip straight to the dashboard.
if (getToken()) {
  window.location.href = "dashboard.html";
}

function showAlert(message, type = "error") {
  alertBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function clearAlert() {
  alertBox.innerHTML = "";
}

function setLoading(button, isLoading, label) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "Please wait…" : label;
}

mobileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert();

  const mobile = mobileInput.value.trim();
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    showAlert("Enter a valid 10-digit Indian mobile number.");
    return;
  }

  setLoading(sendOtpBtn, true, "Send OTP");
  try {
    const data = await apiRequest("/auth/send-otp", { method: "POST", body: { mobile } });
    currentMobile = mobile;
    otpMobileLabel.textContent = `+91 ${mobile}`;
    mobileForm.classList.add("hidden");
    otpForm.classList.remove("hidden");

    if (data.debugOtp) {
      // Demo mode only: no real SMS gateway is wired up (see backend README),
      // so the OTP is surfaced here for convenience while testing locally.
      showAlert(`Demo mode: your OTP is ${data.debugOtp}`, "success");
    } else {
      showAlert("OTP sent to your mobile number.", "success");
    }
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(sendOtpBtn, false, "Send OTP");
  }
});

otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert();

  const otp = otpInput.value.trim();
  if (!otp) {
    showAlert("Enter the OTP you received.");
    return;
  }

  setLoading(verifyOtpBtn, true, "Verify & Login");
  try {
    const data = await apiRequest("/auth/verify-otp", {
      method: "POST",
      body: { mobile: currentMobile, otp },
    });
    setSession(data.token, data.user.mobile);
    window.location.href = "dashboard.html";
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(verifyOtpBtn, false, "Verify & Login");
  }
});

changeNumberBtn.addEventListener("click", () => {
  clearAlert();
  otpForm.classList.add("hidden");
  mobileForm.classList.remove("hidden");
  otpInput.value = "";
});

resendOtpBtn.addEventListener("click", async () => {
  clearAlert();
  try {
    const data = await apiRequest("/auth/send-otp", { method: "POST", body: { mobile: currentMobile } });
    if (data.debugOtp) {
      showAlert(`Demo mode: your OTP is ${data.debugOtp}`, "success");
    } else {
      showAlert("A new OTP has been sent.", "success");
    }
  } catch (err) {
    showAlert(err.message);
  }
});
