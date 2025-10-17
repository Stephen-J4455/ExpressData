// Supabase auth integration (ES module)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const getMeta = (name) =>
  document.querySelector(`meta[name="${name}"]`)?.content || "";
const SUPABASE_URL = getMeta("supabase-url");
const SUPABASE_ANON_KEY = getMeta("supabase-anon-key");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase URL or ANON KEY not set in meta tags. Add them to index.html to enable auth."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Paystack configuration
const PAYSTACK_PUBLIC_KEY = "pk_test_7d6bef2c11764ac43547031baf2c197607286987"; // Replace with your Paystack public key

// Elements
const loginFormContainer = document.getElementById("login-form");
const signupFormContainer = document.getElementById("signup-form");
const mainUI = document.getElementById("main-ui");
const welcomeEl = document.getElementById("welcome");
const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
// top header (logo + app name) shown on auth screens; hide on main UI
const headerEl = document.querySelector(".wavy-header");
// boot overlay shown during auth initialization
const bootOverlay = document.getElementById("boot-overlay");

const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");

// Login inputs
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");

// Signup inputs
const signupName = document.getElementById("signup-name");
const signupEmail = document.getElementById("signup-email");
const signupPassword = document.getElementById("signup-password");
const signupBtn = document.getElementById("signup-btn");

// Social buttons
const googleBtn = document.getElementById("google-signin");
const facebookBtn = document.getElementById("facebook-signin");
const twitterBtn = document.getElementById("twitter-signin");

// Helpers
const show = (el) => el && (el.style.display = "block");
const hide = (el) => el && (el.style.display = "none");

// Password toggle wiring
document.addEventListener("click", (e) => {
  const btn = e.target.closest && e.target.closest(".password-toggle");
  if (!btn) return;
  const targetId = btn.getAttribute("data-target");
  const input = document.getElementById(targetId);
  if (!input) return;
  const icon = btn.querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    if (icon) {
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    }
    btn.setAttribute("aria-label", "Hide password");
  } else {
    input.type = "password";
    if (icon) {
      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
    btn.setAttribute("aria-label", "Show password");
  }
});

// UI helpers: toast and loading modal
const toastEl = document.getElementById("toast");
const loadingModal = document.getElementById("loading-modal");

function showToast(message, { type = "success", timeout = 4000 } = {}) {
  if (!toastEl) return alert(message);
  toastEl.textContent = "";
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.textContent = message;
  toastEl.appendChild(msg);
  toastEl.classList.remove("error", "success");
  toastEl.classList.add(type);
  toastEl.hidden = false;
  // force reflow for animation
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
  if (timeout) setTimeout(() => hideToast(), timeout);
}

function hideToast() {
  if (!toastEl) return;
  toastEl.classList.remove("show");
  setTimeout(() => {
    toastEl.hidden = true;
    toastEl.textContent = "";
  }, 260);
}

function showLoading(text = "Processing...") {
  if (!loadingModal) return;
  const txt = loadingModal.querySelector(".loading-text");
  if (txt) txt.textContent = text;
  loadingModal.hidden = false;
  loadingModal.setAttribute("aria-hidden", "false");
}

function hideLoading() {
  if (!loadingModal) return;
  loadingModal.hidden = true;
  loadingModal.setAttribute("aria-hidden", "true");
}

if (showSignup) {
  showSignup.addEventListener("click", (e) => {
    e.preventDefault();
    hide(loginFormContainer);
    show(signupFormContainer);
  });
}

if (showLogin) {
  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    hide(signupFormContainer);
    // ensure main UI isn't using full-width while auth forms are shown
    if (mainUI) mainUI.classList.remove("full-width");
    show(loginFormContainer);
  });
}

// Signup
if (signupBtn) {
  signupBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = signupEmail.value;
    const password = signupPassword.value;
    const full_name = signupName.value;

    if (!email || !password)
      return showToast("Enter email and password", { type: "error" });

    try {
      showLoading("Creating account...");
      // Supabase JS v2: signUp accepts options under `options` for metadata
      const { data, error } = await supabase.auth.signUp(
        { email, password },
        { data: { full_name } }
      );
      hideLoading();
      if (error) return showToast(error.message, { type: "error" });
      showToast(
        "Signup successful — check your email for confirmation (if enabled)."
      );
      // If the signup returned a user (some flows sign the user in), show main UI
      if (data && data.user) {
        showMainUI(data.session || null, data.user);
      }
    } catch (err) {
      hideLoading();
      showToast(err.message || "Signup failed", { type: "error" });
    }
  });
}

// Login
if (loginBtn) {
  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = loginEmail.value;
    const password = loginPassword.value;

    if (!email || !password)
      return showToast("Enter email and password", { type: "error" });

    try {
      showLoading("Logging in...");
      // Supabase JS v2
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      hideLoading();
      if (error) return showToast(error.message, { type: "error" });
      showToast("Login successful");
      // Show main UI immediately after a successful login
      if (data && data.user) {
        showMainUI(data.session || null, data.user);
      }
    } catch (err) {
      hideLoading();
      showToast(err.message || "Login failed", { type: "error" });
    }
  });
}

// Social sign-in (redirect)
const socialSignIn = async (provider) => {
  try {
    showLoading("Opening provider...");
    // Supabase JS v2: OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({ provider });
    hideLoading();
    if (error) showToast(error.message, { type: "error" });
  } catch (err) {
    hideLoading();
    showToast(err.message || "Social sign-in failed", { type: "error" });
  }
};

if (googleBtn) {
  googleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    socialSignIn("google");
  });
}
if (facebookBtn) {
  facebookBtn.addEventListener("click", (e) => {
    e.preventDefault();
    socialSignIn("facebook");
  });
}
if (twitterBtn) {
  twitterBtn.addEventListener("click", (e) => {
    e.preventDefault();
    socialSignIn("twitter");
  });
}

// Logout button in main UI
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    showLoading("Signing out...");
    const { error } = await supabase.auth.signOut();
    hideLoading();
    if (error) return showToast(error.message, { type: "error" });
    showToast("Signed out");
    // auth state handler will show login form
  });
}

// Provider detail page helpers
const providerDetail = document.getElementById("provider-detail");
const providerBackBtn = document.getElementById("provider-back-btn");
const providerNameEl = document.getElementById("provider-name");
const providerTransactionsEl = document.getElementById("provider-transactions");
const providerOffersEl = document.getElementById("provider-offers-list");
const contentArea = document.querySelector(".content-area");

async function loadOffers(provider) {
  if (!providerOffersEl) return;

  // Show loading state
  providerOffersEl.innerHTML =
    '<div class="offers-loading">Loading offers...</div>';

  try {
    // Query Supabase offers table filtered by network
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("network", provider)
      .order("price", { ascending: true });

    if (error) {
      console.error("Error loading offers:", error);
      providerOffersEl.innerHTML = `<div class="offers-error">Failed to load offers: ${error.message}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      providerOffersEl.innerHTML =
        '<div class="offers-loading">No offers available for this provider.</div>';
      return;
    }

    // Render offers
    providerOffersEl.innerHTML = "";
    data.forEach((offer) => {
      const offerCard = document.createElement("div");
      offerCard.className = "offer-card";
      offerCard.setAttribute("data-offer-id", offer.id);
      offerCard.innerHTML = `
        <div class="offer-content">
          <div class="offer-name">${offer.title || "Offer"}</div>
          <div class="offer-description">${offer.description || ""}</div>
          <div class="offer-price">GHS ${parseFloat(offer.price || 0).toFixed(
            2
          )}</div>
        </div>
        <div class="offer-actions" style="display: none;">
          <button class="offer-btn buy-self" data-offer-id="${
            offer.id
          }" data-action="self">
            <i class="fa fa-user"></i> Buy for Self
          </button>
          <button class="offer-btn buy-others" data-offer-id="${
            offer.id
          }" data-action="others">
            <i class="fa fa-users"></i> Buy for Others
          </button>
        </div>
      `;
      providerOffersEl.appendChild(offerCard);
    });
  } catch (err) {
    console.error("Error fetching offers:", err);
    providerOffersEl.innerHTML = `<div class="offers-error">Error loading offers</div>`;
  }
}

function showProviderDetail(provider) {
  if (!providerDetail || !contentArea) return;
  if (providerNameEl) providerNameEl.textContent = provider;

  // Load offers from Supabase (convert provider to lowercase to match database)
  loadOffers(provider.toLowerCase());

  // Load provider-specific transactions
  loadProviderTransactions(provider);

  contentArea.style.display = "none";
  providerDetail.style.display = "block";
  // Expand container width for the provider detail view
  const containerEl = document.querySelector(".container");
  if (containerEl) containerEl.classList.add("wide");
}

// Load transactions filtered by provider
async function loadProviderTransactions(provider) {
  if (!providerTransactionsEl) return;

  try {
    // Show loading state
    providerTransactionsEl.innerHTML =
      '<div style="text-align: center; color: #666; padding: 20px;">Loading transactions...</div>';

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) return;

    // Fetch orders filtered by provider
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("offer_provider", provider)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching provider transactions:", error);
      providerTransactionsEl.innerHTML =
        '<div style="text-align: center; color: #ef4444; padding: 20px;">Failed to load transactions</div>';
      return;
    }

    // Handle empty state
    if (!orders || orders.length === 0) {
      providerTransactionsEl.innerHTML = `
        <div style="text-align: center; color: #666; padding: 30px 20px;">
          <i class="fa fa-history" style="font-size: 36px; color: #ddd; margin-bottom: 12px;"></i>
          <p style="font-size: 14px;">No transactions with ${provider} yet</p>
        </div>
      `;
      return;
    }

    // Render transactions
    providerTransactionsEl.innerHTML = "";
    orders.forEach((order) => {
      const row = document.createElement("div");
      row.className = "transaction-row";
      row.style.cursor = "pointer";

      // Map order_status to display status
      let statusClass = "status-pending";
      if (order.order_status === "completed") {
        statusClass = "status-success";
      } else if (
        order.order_status === "failed" ||
        order.order_status === "cancelled"
      ) {
        statusClass = "status-failed";
      }

      // Format date
      const orderDate = new Date(order.created_at);
      const formattedDate = orderDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      row.innerHTML = `
        <div class="transaction-left">
          <div class="status-dot ${statusClass}"></div>
          <div>
            <div class="transaction-provider">${order.offer_name}</div>
            <div class="transaction-meta">${formattedDate} • ${
        order.recipient_phone
      }</div>
          </div>
        </div>
        <div class="transaction-amount">GHS ${
          order.amount?.toFixed(2) || "0.00"
        }</div>
      `;

      row.addEventListener("click", () => {
        showOrderDetails(order);
      });

      providerTransactionsEl.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading provider transactions:", error);
    if (providerTransactionsEl) {
      providerTransactionsEl.innerHTML =
        '<div style="text-align: center; color: #ef4444; padding: 20px;">Error loading transactions</div>';
    }
  }
}

function hideProviderDetail() {
  if (!providerDetail || !contentArea) return;
  providerDetail.style.display = "none";
  contentArea.style.display = "block";
  const containerEl = document.querySelector(".container");
  if (containerEl) containerEl.classList.remove("wide");
}

if (providerBackBtn) {
  providerBackBtn.addEventListener("click", hideProviderDetail);
}

// Transaction detail page helpers
const transactionBackBtn = document.getElementById("transaction-back-btn");

if (transactionBackBtn) {
  transactionBackBtn.addEventListener("click", hideTransactionDetail);
}

// Account page helpers
const accountPage = document.getElementById("account-page");
const accountBackBtn = document.getElementById("account-back-btn");
const profilePic = document.getElementById("profile-pic");
const accountLogoutBtn = document.getElementById("account-logout-btn");

function showAccountPage() {
  if (!accountPage || !contentArea) return;

  // Populate account page with user data
  const accountProfilePic = document.getElementById("account-profile-pic");
  const accountName = document.getElementById("account-name");
  const accountEmail = document.getElementById("account-email");
  const accountBalance = document.getElementById("account-balance");
  const accountPhone = document.getElementById("account-phone");
  const accountProvider = document.getElementById("account-provider");

  const profileNameEl = document.getElementById("profile-name");
  const profilePicEl = document.getElementById("profile-pic");
  const simNumberEl = document.getElementById("sim-number");
  const simPlanEl = document.getElementById("sim-plan");

  if (accountProfilePic && profilePicEl) {
    accountProfilePic.src = profilePicEl.src;
  }
  if (accountName && profileNameEl) {
    accountName.textContent = profileNameEl.textContent;
  }

  // Get user data from session
  supabase.auth.getSession().then(({ data }) => {
    const user = data?.session?.user;
    if (!user) return;

    // Set email
    if (accountEmail) {
      accountEmail.textContent = user.email || "user@email.com";
    }

    // Set phone number from metadata
    if (accountPhone) {
      const phone =
        user.user_metadata?.phone_number ||
        user.user_metadata?.phone ||
        user.user_metadata?.sim_number ||
        "+233 XX XXX XXXX";
      accountPhone.textContent = phone;
    }

    // Set network provider from metadata
    if (accountProvider) {
      const provider =
        user.user_metadata?.network_provider ||
        user.user_metadata?.provider ||
        "Network Provider";
      const span = accountProvider.querySelector("span");
      if (span) span.textContent = provider;
    }

    // Set balance from metadata or SIM display
    if (accountBalance) {
      const balance =
        user.user_metadata?.balance || simPlanEl?.textContent || "GHS 0.00";
      accountBalance.textContent = balance;
    }
  });

  // Hide content area and show account page
  contentArea.style.display = "none";
  if (providerDetail) providerDetail.style.display = "none";
  accountPage.style.display = "block";

  const containerEl = document.querySelector(".container");
  if (containerEl) containerEl.classList.add("wide");
}

function hideAccountPage() {
  if (!accountPage || !contentArea) return;
  accountPage.style.display = "none";
  contentArea.style.display = "block";
  const containerEl = document.querySelector(".container");
  if (containerEl) containerEl.classList.remove("wide");
}

// Wire up profile pic click
if (profilePic) {
  profilePic.addEventListener("click", showAccountPage);
  profilePic.style.cursor = "pointer";
}

// Wire up account back button
if (accountBackBtn) {
  accountBackBtn.addEventListener("click", hideAccountPage);
}

// Wire up account logout button
if (accountLogoutBtn) {
  accountLogoutBtn.addEventListener("click", async () => {
    showLoading("Signing out...");
    const { error } = await supabase.auth.signOut();
    hideLoading();
    if (error) return showToast(error.message, { type: "error" });
    showToast("Signed out");
    // Close account page
    hideAccountPage();
  });
}

// Wire up Edit Profile button
const editProfileBtn = document.getElementById("edit-profile-btn");
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", showEditProfileModal);
}

// Phone update modal functionality
const phoneUpdateModal = document.getElementById("phone-update-modal");
const phoneModalClose = document.getElementById("phone-modal-close");
const phoneCancelBtn = document.getElementById("phone-cancel-btn");
const phoneSaveBtn = document.getElementById("phone-save-btn");
const phoneInput = document.getElementById("phone-input");
const providerSelect = document.getElementById("provider-select");

function showPhoneModal() {
  if (!phoneUpdateModal) return;

  // Pre-populate with current values
  supabase.auth.getSession().then(({ data }) => {
    const user = data?.session?.user;
    if (user) {
      if (phoneInput) {
        phoneInput.value =
          user.user_metadata?.phone_number || user.user_metadata?.phone || "";
      }
      if (providerSelect) {
        providerSelect.value =
          user.user_metadata?.network_provider ||
          user.user_metadata?.provider ||
          "";
      }
    }
  });

  phoneUpdateModal.hidden = false;
  phoneUpdateModal.setAttribute("aria-hidden", "false");
  setTimeout(() => phoneInput?.focus(), 100);
}

function hidePhoneModal() {
  if (!phoneUpdateModal) return;
  phoneUpdateModal.hidden = true;
  phoneUpdateModal.setAttribute("aria-hidden", "true");
}

// Wire up SIM card click to open modal
document.addEventListener("click", (e) => {
  const simCard = e.target.closest(".sim-card-display");
  if (simCard) {
    showPhoneModal();
  }
});

// Wire up modal close buttons
if (phoneModalClose) {
  phoneModalClose.addEventListener("click", hidePhoneModal);
}

if (phoneCancelBtn) {
  phoneCancelBtn.addEventListener("click", hidePhoneModal);
}

// Close modal when clicking outside
if (phoneUpdateModal) {
  phoneUpdateModal.addEventListener("click", (e) => {
    if (e.target === phoneUpdateModal) {
      hidePhoneModal();
    }
  });
}

// Handle save button
if (phoneSaveBtn) {
  phoneSaveBtn.addEventListener("click", async () => {
    const phone = phoneInput?.value?.trim();
    const provider = providerSelect?.value;

    if (!phone) {
      return showToast("Please enter a phone number", { type: "error" });
    }

    if (!provider) {
      return showToast("Please select a network provider", { type: "error" });
    }

    try {
      showLoading("Updating phone number...");

      // Update user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          phone_number: phone,
          network_provider: provider,
        },
      });

      hideLoading();

      if (error) {
        return showToast(error.message, { type: "error" });
      }

      showToast("Phone number updated successfully!");
      hidePhoneModal();

      // Update the top bar SIM card immediately
      const simNumberEl = document.getElementById("sim-number");
      if (simNumberEl) simNumberEl.textContent = phone;

      // Refresh the account page to show new data if it's open
      if (accountPage && accountPage.style.display !== "none") {
        // Update the displayed phone and provider immediately
        const accountPhone = document.getElementById("account-phone");
        const accountProvider = document.getElementById("account-provider");

        if (accountPhone) accountPhone.textContent = phone;
        if (accountProvider) {
          const span = accountProvider.querySelector("span");
          if (span) span.textContent = provider;
        }
      }
    } catch (err) {
      hideLoading();
      showToast(err.message || "Failed to update phone number", {
        type: "error",
      });
    }
  });
}

// Edit Profile modal functionality
const editProfileModal = document.getElementById("edit-profile-modal");
const profileModalClose = document.getElementById("profile-modal-close");
const profileCancelBtn = document.getElementById("profile-cancel-btn");
const profileSaveBtn = document.getElementById("profile-save-btn");
const usernameInput = document.getElementById("username-input");
const profilePhoneInput = document.getElementById("profile-phone-input");

function showEditProfileModal() {
  if (!editProfileModal) return;

  // Pre-populate with current values
  supabase.auth.getSession().then(({ data }) => {
    const user = data?.session?.user;
    if (user) {
      if (usernameInput) {
        usernameInput.value = user.user_metadata?.username || "";
      }
      if (profilePhoneInput) {
        profilePhoneInput.value =
          user.user_metadata?.phone_number || user.user_metadata?.phone || "";
      }
    }
  });

  editProfileModal.hidden = false;
  editProfileModal.setAttribute("aria-hidden", "false");
  setTimeout(() => usernameInput?.focus(), 100);
}

function hideEditProfileModal() {
  if (!editProfileModal) return;
  editProfileModal.hidden = true;
  editProfileModal.setAttribute("aria-hidden", "true");
}

// Wire up modal close buttons
if (profileModalClose) {
  profileModalClose.addEventListener("click", hideEditProfileModal);
}

if (profileCancelBtn) {
  profileCancelBtn.addEventListener("click", hideEditProfileModal);
}

// Close modal when clicking outside
if (editProfileModal) {
  editProfileModal.addEventListener("click", (e) => {
    if (e.target === editProfileModal) {
      hideEditProfileModal();
    }
  });
}

// Handle save button
if (profileSaveBtn) {
  profileSaveBtn.addEventListener("click", async () => {
    const username = usernameInput?.value?.trim();
    const phone = profilePhoneInput?.value?.trim();

    if (!username) {
      return showToast("Please enter a username", { type: "error" });
    }

    if (!phone) {
      return showToast("Please enter a phone number", { type: "error" });
    }

    // Basic phone validation (should start with + or digit)
    if (!/^[\+\d][\d\s\-\(\)]+$/.test(phone)) {
      return showToast("Please enter a valid phone number", { type: "error" });
    }

    try {
      showLoading("Updating profile...");

      // Update user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          username: username,
          phone_number: phone,
          phone: phone, // Store in both fields for compatibility
        },
      });

      hideLoading();

      if (error) {
        return showToast(error.message, { type: "error" });
      }

      showToast("Profile updated successfully!");
      hideEditProfileModal();

      // Update the profile display immediately
      const profileNameEl = document.getElementById("profile-name");
      const simNumberEl = document.getElementById("sim-number");

      if (profileNameEl) profileNameEl.textContent = username;
      if (simNumberEl) simNumberEl.textContent = phone;

      // Update account page if it's open
      if (accountPage && accountPage.style.display !== "none") {
        const accountName = document.getElementById("account-name");
        const accountPhone = document.getElementById("account-phone");

        if (accountName) accountName.textContent = username;
        if (accountPhone) accountPhone.textContent = phone;
      }

      // Update avatar with new username
      const avatarUrl = `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(
        username
      )}&backgroundColor=6a11cb,2575fc`;

      const profilePicEl = document.getElementById("profile-pic");
      const accountProfilePic = document.getElementById("account-profile-pic");

      if (profilePicEl) profilePicEl.src = avatarUrl;
      if (accountProfilePic) accountProfilePic.src = avatarUrl;
    } catch (err) {
      hideLoading();
      showToast(err.message || "Failed to update profile", {
        type: "error",
      });
    }
  });
}

// Paystack payment initialization
async function initializePaystackPayment(
  offerData,
  buyForSelf = true,
  recipientPhoneParam = null
) {
  console.log("[Paystack] Initializing payment...");
  console.log("[Paystack] Offer data:", offerData);
  console.log("[Paystack] Buy for self:", buyForSelf);
  console.log("[Paystack] Recipient phone:", recipientPhoneParam);

  try {
    // Validate offer data
    if (!offerData) {
      console.error("[Paystack] Offer data is null or undefined!");
      showToast("Offer information is missing. Please try again.", {
        type: "error",
      });
      return;
    }

    if (!offerData.price || isNaN(offerData.price) || offerData.price <= 0) {
      console.error("[Paystack] Invalid offer price:", offerData.price);
      showToast("Invalid offer price. Please try again.", {
        type: "error",
      });
      return;
    }

    if (!offerData.name) {
      console.error("[Paystack] Offer name is missing!");
      showToast("Offer name is missing. Please try again.", {
        type: "error",
      });
      return;
    }

    // Check if PaystackPop is available
    if (typeof PaystackPop === "undefined") {
      console.error("[Paystack] PaystackPop is not defined!");
      showToast("Payment system not loaded. Please refresh the page.", {
        type: "error",
      });
      return;
    }

    // Get current user session
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      console.error("[Paystack] User not logged in");
      showToast("Please login to make a purchase", { type: "error" });
      return;
    }

    console.log("[Paystack] User authenticated:", user.email);

    const userEmail = user.email;
    const userName =
      user.user_metadata?.username || user.email?.split("@")[0] || "User";

    // Convert GHS amount to pesewas (smallest currency unit for Paystack)
    const amountInPesewas = Math.round(offerData.price * 100);
    console.log("[Paystack] Amount in pesewas:", amountInPesewas);

    // Get phone number based on purchase type
    let recipientPhone = null;
    if (buyForSelf) {
      // For self: get from user metadata
      recipientPhone =
        user.user_metadata?.phone_number || user.user_metadata?.phone;
      if (!recipientPhone || recipientPhone === "+233 XX XXX XXXX") {
        console.error("[Paystack] User phone number not set");
        showToast("Please update your phone number in account settings first", {
          type: "error",
        });
        showAccountPage();
        return;
      }
    } else {
      // For others: use the provided phone number parameter
      if (!recipientPhoneParam) {
        console.error("[Paystack] Recipient phone number not provided");
        showToast("Recipient phone number is required", { type: "error" });
        return;
      }
      recipientPhone = recipientPhoneParam;
    }

    console.log("[Paystack] Recipient phone:", recipientPhone);
    console.log("[Paystack] Setting up Paystack popup...");

    // Initialize Paystack payment
    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amountInPesewas,
      currency: "GHS",
      ref: `EXPRESS_${Date.now()}_${user.id.substring(0, 8)}`,
      metadata: {
        custom_fields: [
          {
            display_name: "Offer Name",
            variable_name: "offer_name",
            value: offerData.name,
          },
          {
            display_name: "Network Provider",
            variable_name: "network",
            value: offerData.network,
          },
          {
            display_name: "Recipient Phone",
            variable_name: "recipient_phone",
            value: recipientPhone,
          },
          {
            display_name: "Buy For Self",
            variable_name: "buy_for_self",
            value: buyForSelf ? "Yes" : "No",
          },
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: user.id,
          },
        ],
      },
      callback: function (response) {
        console.log("[Paystack] Payment successful:", response);
        handlePaymentSuccess(response, offerData, recipientPhone, buyForSelf);
      },
      onClose: function () {
        console.log("[Paystack] Payment modal closed");
        showToast("Payment cancelled", { type: "error" });
      },
    });

    console.log("[Paystack] Opening payment iframe...");
    handler.openIframe();
  } catch (error) {
    console.error("[Paystack] Payment initialization error:", error);
    showToast("Failed to initialize payment. Please try again.", {
      type: "error",
    });
  }
}

// Handle successful payment
async function handlePaymentSuccess(
  response,
  offerData,
  recipientPhone,
  buyForSelf
) {
  showLoading("Verifying payment...");

  try {
    console.log("[Payment Success] Paystack response:", response);
    console.log("[Payment Success] Verifying with Supabase Edge Function...");

    // Get current user session
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      throw new Error("User session not found");
    }

    // Call Supabase Edge Function to verify payment and create order
    const { data: verifyData, error: verifyError } =
      await supabase.functions.invoke("express_api", {
        body: {
          reference: response.reference,
          offerData: offerData,
          recipientPhone: recipientPhone,
          buyForSelf: buyForSelf,
        },
      });

    console.log("[Payment Success] Edge Function response:", verifyData);

    if (verifyError) {
      console.error("[Payment Success] Edge Function error:", verifyError);
      throw new Error(verifyError.message || "Payment verification failed");
    }

    if (!verifyData || !verifyData.success) {
      throw new Error(verifyData?.error || "Payment verification failed");
    }

    hideLoading();

    // Extract order details
    const orderId = verifyData.order?.id?.substring(0, 8) || "new";
    const amount = verifyData.payment?.amount || offerData.price;
    const recipient = buyForSelf ? "your number" : recipientPhone;

    // Show detailed success message
    const successMessage = buyForSelf
      ? `✅ Order Confirmed!\n\nOrder ID: #${orderId}\nBundle: ${
          offerData.name
        }\nAmount: GHS ${amount.toFixed(
          2
        )}\n\nYour data bundle will be delivered to ${recipientPhone} shortly!`
      : `✅ Order Confirmed!\n\nOrder ID: #${orderId}\nBundle: ${
          offerData.name
        }\nRecipient: ${recipientPhone}\nAmount: GHS ${amount.toFixed(
          2
        )}\n\nData bundle will be sent shortly!`;

    showToast(successMessage, { type: "success", timeout: 8000 });

    // Log success for debugging
    console.log("[Payment Success] Order created:", {
      orderId: orderId,
      offerName: offerData.name,
      recipient: recipientPhone,
      amount: amount,
      buyForSelf: buyForSelf,
    });

    // Refresh transactions list to show new order
    refreshTransactionsList();
  } catch (error) {
    hideLoading();
    console.error("[Payment Success] Error:", error);

    // Provide helpful error messages
    const errorMessage = error.message || "Unknown error occurred";

    if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
      showToast(
        "Payment successful but verification failed. Your order will be processed. Reference: " +
          response.reference,
        { type: "error", timeout: 8000 }
      );
    } else {
      showToast(
        "Payment verification failed: " +
          errorMessage +
          ". Contact support with reference: " +
          response.reference,
        { type: "error", timeout: 8000 }
      );
    }
  }
}

// Refresh transactions list after purchase
async function refreshTransactionsList() {
  const transactionsListEl = document.getElementById("transactions-list");
  if (!transactionsListEl) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) return;

    // Show loading state
    transactionsListEl.innerHTML =
      '<div style="text-align: center; color: #666; padding: 20px;">Loading orders...</div>';

    // Fetch user's orders from Supabase orders table
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching orders:", error);
      transactionsListEl.innerHTML =
        '<div style="text-align: center; color: #ef4444; padding: 20px;">Failed to load orders</div>';
      return;
    }

    // Handle empty state
    if (!orders || orders.length === 0) {
      transactionsListEl.innerHTML = `
        <div style="text-align: center; color: #666; padding: 40px 20px;">
          <i class="fa fa-shopping-bag" style="font-size: 48px; color: #ddd; margin-bottom: 16px;"></i>
          <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No orders yet</p>
          <p style="font-size: 14px; color: #999;">Your purchase history will appear here</p>
        </div>
      `;
      return;
    }

    // Render orders
    transactionsListEl.innerHTML = "";
    orders.forEach((order) => {
      const row = document.createElement("div");
      row.className = "transaction-row";
      row.style.cursor = "pointer";
      row.title = `Click to view order details - Ref: ${order.payment_reference}`;

      // Map order_status to display status
      let statusClass = "status-pending";
      let statusText = "Processing";
      if (order.order_status === "completed") {
        statusClass = "status-success";
        statusText = "Completed";
      } else if (order.order_status === "failed") {
        statusClass = "status-failed";
        statusText = "Failed";
      } else if (order.order_status === "cancelled") {
        statusClass = "status-failed";
        statusText = "Cancelled";
      }

      // Format date
      const orderDate = new Date(order.created_at);
      const formattedDate = orderDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Determine recipient display
      const recipientInfo = order.buy_for_self
        ? "For yourself"
        : `To ${order.recipient_phone}`;

      row.innerHTML = `
        <div class="transaction-left">
          <div class="status-dot ${statusClass}" title="${statusText}"></div>
          <div>
            <div class="transaction-provider">${
              order.offer_provider || "N/A"
            }</div>
            <div class="transaction-meta">${
              order.offer_name || "Purchase"
            } • ${recipientInfo}</div>
            <div class="transaction-meta" style="font-size: 11px; opacity: 0.7;">${formattedDate}</div>
          </div>
        </div>
        <div class="transaction-amount">GHS ${
          order.amount?.toFixed(2) || "0.00"
        }</div>
      `;

      // Add click handler to show order details
      row.addEventListener("click", () => {
        showOrderDetails(order);
      });

      transactionsListEl.appendChild(row);
    });
  } catch (error) {
    console.error("Error refreshing transactions:", error);
    if (transactionsListEl) {
      transactionsListEl.innerHTML =
        '<div style="text-align: center; color: #ef4444; padding: 20px;">Error loading orders</div>';
    }
  }
}

// Show order details in a dedicated page
function showOrderDetails(order) {
  const transactionDetailPage = document.getElementById(
    "transaction-detail-page"
  );
  const contentArea = document.querySelector(".content-area");
  const providerDetail = document.getElementById("provider-detail");
  const accountPage = document.getElementById("account-page");

  if (!transactionDetailPage) return;

  // Format date
  const orderDate = new Date(order.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Update status card
  const statusIcon = document.getElementById("detail-status-icon");
  const statusValue = document.getElementById("detail-status-value");

  if (statusIcon && statusValue) {
    statusIcon.className = "status-icon";
    if (order.order_status === "completed") {
      statusIcon.classList.add("completed");
      statusIcon.innerHTML = '<i class="fa fa-check-circle"></i>';
      statusValue.textContent = "Completed";
      statusValue.style.color = "#10b981";
    } else if (order.order_status === "processing") {
      statusIcon.classList.add("pending");
      statusIcon.innerHTML = '<i class="fa fa-clock"></i>';
      statusValue.textContent = "Processing";
      statusValue.style.color = "#f59e0b";
    } else {
      statusIcon.classList.add("failed");
      statusIcon.innerHTML = '<i class="fa fa-times-circle"></i>';
      statusValue.textContent = "Failed";
      statusValue.style.color = "#ef4444";
    }
  }

  // Update order information
  const detailOrderId = document.getElementById("detail-order-id");
  const detailBundle = document.getElementById("detail-bundle");
  const detailProvider = document.getElementById("detail-provider");
  const detailAmount = document.getElementById("detail-amount");

  if (detailOrderId) detailOrderId.textContent = `#${order.id.substring(0, 8)}`;
  if (detailBundle) detailBundle.textContent = order.offer_name || "N/A";
  if (detailProvider)
    detailProvider.textContent = order.offer_provider || "N/A";
  if (detailAmount)
    detailAmount.textContent = `GHS ${order.amount?.toFixed(2) || "0.00"}`;

  // Update recipient information
  const detailRecipient = document.getElementById("detail-recipient");
  const detailType = document.getElementById("detail-type");

  if (detailRecipient)
    detailRecipient.textContent = order.recipient_phone || "N/A";
  if (detailType)
    detailType.textContent = order.buy_for_self ? "For yourself" : "Gift";

  // Update payment information
  const detailPaymentStatus = document.getElementById("detail-payment-status");
  const detailReference = document.getElementById("detail-reference");
  const detailDate = document.getElementById("detail-date");

  if (detailPaymentStatus) {
    detailPaymentStatus.textContent =
      order.payment_status?.toUpperCase() || "N/A";
    detailPaymentStatus.style.color =
      order.payment_status === "paid" ? "#10b981" : "#f59e0b";
  }
  if (detailReference)
    detailReference.textContent = order.payment_reference || "N/A";
  if (detailDate) detailDate.textContent = orderDate;

  // Hide other pages and show transaction detail
  if (contentArea) contentArea.style.display = "none";
  if (providerDetail) providerDetail.style.display = "none";
  if (accountPage) accountPage.style.display = "none";
  transactionDetailPage.style.display = "block";

  // Expand container width
  const containerEl = document.querySelector(".container");
  if (containerEl) containerEl.classList.add("wide");
}

// Hide transaction detail page
function hideTransactionDetail() {
  const transactionDetailPage = document.getElementById(
    "transaction-detail-page"
  );
  const contentArea = document.querySelector(".content-area");

  if (!transactionDetailPage || !contentArea) return;

  transactionDetailPage.style.display = "none";
  contentArea.style.display = "block";

  const containerEl = document.querySelector(".container");
  if (containerEl) containerEl.classList.remove("wide");
}

// Recipient Phone Modal for "Buy for Others"
let currentOfferForOthers = null;

function showRecipientPhoneModal(offerData) {
  console.log("[Modal] Opening recipient phone modal");
  console.log("[Modal] Offer data received:", offerData);

  if (!offerData) {
    console.error("[Modal] Offer data is null!");
    showToast("Offer information is missing. Please try again.", {
      type: "error",
    });
    return;
  }

  if (!offerData.price || offerData.price <= 0) {
    console.error("[Modal] Invalid offer price:", offerData.price);
    showToast("Invalid offer price. Please select the offer again.", {
      type: "error",
    });
    return;
  }

  currentOfferForOthers = offerData;
  console.log(
    "[Modal] Stored offer in currentOfferForOthers:",
    currentOfferForOthers
  );

  const modal = document.getElementById("recipient-phone-modal");
  const input = document.getElementById("recipient-phone-input");

  if (!modal) {
    console.error("[Modal] Modal element not found!");
    return;
  }

  // Clear previous input
  if (input) input.value = "";

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");

  // Focus on input after a short delay
  setTimeout(() => input?.focus(), 100);
}

function hideRecipientPhoneModal() {
  const modal = document.getElementById("recipient-phone-modal");
  if (!modal) return;

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  currentOfferForOthers = null;
}

function validateAndProceedWithRecipientPhone() {
  const input = document.getElementById("recipient-phone-input");
  const recipientPhone = input?.value?.trim();

  console.log("[Buy for Others] Validating phone:", recipientPhone);

  if (!recipientPhone || recipientPhone === "") {
    showToast("Phone number is required to purchase for others", {
      type: "error",
    });
    input?.focus();
    return;
  }

  // Validate phone number format (Ghana phone numbers)
  // Accepts: +233XXXXXXXXX or 0XXXXXXXXX (10 digits total)
  const phoneRegex = /^(\+233|0)[0-9]{9}$/;

  if (!phoneRegex.test(recipientPhone)) {
    showToast("Invalid phone number format. Use +233XXXXXXXXX or 0XXXXXXXXX", {
      type: "error",
      timeout: 5000,
    });
    input?.focus();
    return;
  }

  console.log("[Buy for Others] Phone validated successfully");
  console.log("[Buy for Others] Current offer:", currentOfferForOthers);

  if (!currentOfferForOthers) {
    showToast("Offer data not found. Please try again.", { type: "error" });
    console.error("[Buy for Others] currentOfferForOthers is null");
    return;
  }

  // Check if Paystack is loaded
  if (typeof PaystackPop === "undefined") {
    showToast("Payment system not loaded. Please refresh the page.", {
      type: "error",
    });
    console.error("[Buy for Others] PaystackPop is not defined");
    return;
  }

  console.log("[Buy for Others] Proceeding to Paystack payment...");

  // Save offer data to local variable BEFORE hiding modal
  // (hideRecipientPhoneModal sets currentOfferForOthers to null)
  const offerData = currentOfferForOthers;

  // Hide modal and proceed to payment
  hideRecipientPhoneModal();

  // Small delay to ensure modal is hidden before Paystack opens
  setTimeout(() => {
    console.log("[Buy for Others] Calling Paystack with offer:", offerData);
    initializePaystackPayment(offerData, false, recipientPhone);
  }, 200);
}

// Wire up recipient phone modal buttons
const recipientModalClose = document.getElementById("recipient-modal-close");
const recipientCancelBtn = document.getElementById("recipient-cancel-btn");
const recipientProceedBtn = document.getElementById("recipient-proceed-btn");
const recipientPhoneModal = document.getElementById("recipient-phone-modal");
const recipientPhoneInput = document.getElementById("recipient-phone-input");

if (recipientModalClose) {
  recipientModalClose.addEventListener("click", hideRecipientPhoneModal);
}

if (recipientCancelBtn) {
  recipientCancelBtn.addEventListener("click", hideRecipientPhoneModal);
}

if (recipientProceedBtn) {
  recipientProceedBtn.addEventListener(
    "click",
    validateAndProceedWithRecipientPhone
  );
}

// Close modal when clicking outside
if (recipientPhoneModal) {
  recipientPhoneModal.addEventListener("click", (e) => {
    if (e.target === recipientPhoneModal) {
      hideRecipientPhoneModal();
    }
  });
}

// Allow Enter key to proceed
if (recipientPhoneInput) {
  recipientPhoneInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      validateAndProceedWithRecipientPhone();
    }
  });
}

// Wire up account list items (placeholder functionality)
document.addEventListener("click", (e) => {
  const listItem = e.target.closest(".account-list-item[data-action]");
  if (listItem) {
    const action = listItem.getAttribute("data-action");
    showToast(
      `${
        action.charAt(0).toUpperCase() + action.slice(1)
      } feature coming soon!`,
      { type: "success" }
    );
  }
});

// Handle offer card clicks to show/hide action buttons
document.addEventListener("click", (e) => {
  // Check if clicking on an offer button
  const offerBtn = e.target.closest(".offer-btn");
  if (offerBtn) {
    const action = offerBtn.getAttribute("data-action");
    const offerId = offerBtn.getAttribute("data-offer-id");
    const offerCard = offerBtn.closest(".offer-card");

    console.log("[Offer Button] Action:", action);
    console.log("[Offer Button] Offer card found:", !!offerCard);

    if (!offerCard) {
      console.error("[Offer Button] Offer card not found!");
      showToast("Unable to find offer details. Please try again.", {
        type: "error",
      });
      return;
    }

    const offerName =
      offerCard.querySelector(".offer-name")?.textContent || "Offer";
    const offerPrice =
      offerCard.querySelector(".offer-price")?.textContent || "0";
    const offerDesc =
      offerCard.querySelector(".offer-description")?.textContent || "";

    console.log("[Offer Button] Offer name:", offerName);
    console.log("[Offer Button] Offer price text:", offerPrice);
    console.log("[Offer Button] Offer description:", offerDesc);

    // Extract price number from text (e.g., "GHS 5.00" -> 5.00)
    const priceMatch = offerPrice.match(/[\d.]+/);
    const price = priceMatch ? parseFloat(priceMatch[0]) : 0;

    console.log("[Offer Button] Extracted price:", price);

    if (!price || price <= 0) {
      console.error("[Offer Button] Invalid price extracted:", price);
      showToast("Unable to determine offer price. Please try again.", {
        type: "error",
      });
      return;
    }

    // Get current provider name from the page
    const providerNameEl = document.getElementById("provider-name");
    const network = providerNameEl?.textContent || "Unknown";

    console.log("[Offer Button] Network provider:", network);

    // Create offer data object
    const offerData = {
      id: offerId,
      name: offerName,
      price: price,
      description: offerDesc,
      network: network,
    };

    console.log("[Offer Button] Created offer data:", offerData);

    if (action === "self") {
      // Buy for self - initiate Paystack payment
      console.log("[Offer Button] Triggering 'Buy for Self'");
      initializePaystackPayment(offerData, true);
    } else if (action === "others") {
      // Buy for others - show modal to ask for phone number
      console.log("[Offer Button] Triggering 'Buy for Others' modal");
      showRecipientPhoneModal(offerData);
    }

    // Close the actions after clicking
    setTimeout(() => {
      const actions = offerCard.querySelector(".offer-actions");
      if (actions) {
        actions.style.display = "none";
        offerCard.classList.remove("expanded");
      }
    }, 500);
    return;
  }

  // Check if clicking on an offer card (but not on buttons)
  const offerCard = e.target.closest(".offer-card");
  if (offerCard && !e.target.closest(".offer-actions")) {
    const actions = offerCard.querySelector(".offer-actions");
    if (actions) {
      const isVisible = actions.style.display !== "none";

      // Close all other offer actions first
      document.querySelectorAll(".offer-card .offer-actions").forEach((el) => {
        el.style.display = "none";
      });
      document.querySelectorAll(".offer-card").forEach((el) => {
        el.classList.remove("expanded");
      });

      // Toggle current offer actions
      if (!isVisible) {
        actions.style.display = "flex";
        offerCard.classList.add("expanded");
      }
    }
    return;
  }
});

// Wire up card clicks
document.addEventListener("click", (e) => {
  const card = e.target.closest(".card-item[data-provider]");
  if (card) {
    const provider = card.getAttribute("data-provider");
    showProviderDetail(provider);
  }
});

// Wire up keyboard: Enter or Space on card-item
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches(".card-item[data-provider]")
  ) {
    e.preventDefault();
    const provider = e.target.getAttribute("data-provider");
    showProviderDetail(provider);
  }
});

// Helper to show the main UI from a session/user object
function showMainUI(session, user) {
  if (!mainUI) return;
  hide(loginFormContainer);
  hide(signupFormContainer);
  // hide the top header when showing the main UI
  if (headerEl) headerEl.style.display = "none";
  mainUI.style.display = "block";
  // Ensure main UI uses the full-width container so auth CSS doesn't constrain it
  mainUI.classList.add("full-width");
  // Profile card elements (may not exist in older markup)
  const profileNameEl = document.getElementById("profile-name");
  const profilePicEl = document.getElementById("profile-pic");
  const profileEmailEl = document.getElementById("profile-email");
  const simNumberEl = document.getElementById("sim-number");
  const simPlanEl = document.getElementById("sim-plan");

  const displayName = user?.user_metadata?.username || user?.email || "User";
  // Use metadata avatar or fallback to DiceBear initials avatar
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(
      displayName
    )}&backgroundColor=6a11cb,2575fc`;

  if (profileNameEl) profileNameEl.textContent = displayName;
  // profile email removed from layout
  if (profilePicEl) profilePicEl.src = avatarUrl;

  // SIM data: check metadata or leave placeholders
  const phoneNumber =
    user?.user_metadata?.phone_number ||
    user?.user_metadata?.phone ||
    "+233 XX XXX XXXX";
  const balance = user?.user_metadata?.balance || "GHS 0.00";

  if (simNumberEl) simNumberEl.textContent = phoneNumber;
  if (simPlanEl) simPlanEl.textContent = balance;

  // Load actual user orders into transactions-list
  refreshTransactionsList();
}

// Wire up card clicks
document.addEventListener("click", (e) => {
  const card = e.target.closest(".card-item[data-provider]");
  if (card) {
    const provider = card.getAttribute("data-provider");
    showProviderDetail(provider);
  }
});

// Wire up keyboard: Enter or Space on card-item
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches(".card-item[data-provider]")
  ) {
    e.preventDefault();
    const provider = e.target.getAttribute("data-provider");
    showProviderDetail(provider);
  }
});

// Auth state
// Central auth handler reused for events and initialization
function handleAuthChange(event, session) {
  // Normalize inputs: can be called as (event, session) by onAuthStateChange
  // or as (session) by the initializer.
  let eventType = null;
  if (event && typeof event === "object" && "type" in event) {
    eventType = event.type;
    // prefer explicit session argument if provided, else use event.session
    session = session ?? event.session ?? null;
  } else {
    // called with session only (initializer passes session)
    session = event ?? session ?? null;
  }

  console.log("Auth handler called", { eventType, session });

  if (session && session.user) {
    showMainUI(session, session.user);
    return;
  }

  // If there's no session:
  // - If the event explicitly says SIGNED_OUT (user clicked logout), hide UI immediately.
  // - Otherwise (transient/no-session event), double-check by asking getSession()
  //   to avoid temporary races that would flip the UI back to login.
  if (eventType === "SIGNED_OUT" || eventType === "USER_DELETED") {
    console.log("Signed out (explicit)");
    if (mainUI) {
      mainUI.style.display = "none";
      if (headerEl) headerEl.style.display = "";
      if (mainUI) mainUI.classList.remove("full-width");
      show(loginFormContainer);
    }
    return;
  }

  // For other cases where session is undefined, confirm by fetching the session
  // again before hiding the UI. Use a short debounce to collapse rapid events.
  if (typeof handleAuthChange._recheckTimer !== "undefined") {
    clearTimeout(handleAuthChange._recheckTimer);
  }
  const DEBOUNCE_MS = 300; // safe mid-point between 200-500ms
  handleAuthChange._recheckTimer = setTimeout(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const current = data?.session || null;
      console.log("Auth recheck session:", { current });
      if (current && current.user) {
        showMainUI(current, current.user);
      } else {
        console.log("Signed out (confirmed)");
        if (mainUI) {
          mainUI.style.display = "none";
          if (headerEl) headerEl.style.display = "";
          if (mainUI) mainUI.classList.remove("full-width");
          show(loginFormContainer);
        }
      }
    } catch (e) {
      console.error("Auth recheck failed", e);
    } finally {
      delete handleAuthChange._recheckTimer;
      if (bootOverlay) {
        bootOverlay.setAttribute("aria-hidden", "true");
        bootOverlay.hidden = true;
      }
    }
  }, DEBOUNCE_MS);
}

// Subscribe to auth state changes
supabase.auth.onAuthStateChange((event, session) =>
  handleAuthChange(event, session)
);

// On initial load, call Supabase to get the current session and pass it to the handler.
(async function initializeAuthUI() {
  try {
    console.debug("[auth:init] checking for existing session...");
    const { data } = await supabase.auth.getSession();
    const session = data?.session || null;
    console.debug("[auth:init] supabase.getSession result:", { data, session });

    // Log common client-side storage where Supabase might keep session
    try {
      console.debug(
        "[auth:init] localStorage keys:",
        Object.keys(localStorage || {})
      );
      // attempt to read typical supabase tokens in localStorage
      console.debug(
        "[auth:init] access_token:",
        localStorage.getItem("supabase.auth.token")
      );
    } catch (e) {
      console.debug("[auth:init] localStorage read error", e);
    }

    // Log cookies (helpful if you rely on cookies for session)
    try {
      console.debug("[auth:init] document.cookie:", document.cookie);
    } catch (e) {
      console.debug("[auth:init] cookie read error", e);
    }

    // If supabase returned no session, try a safe localStorage fallback: detect
    // any stored token object containing access_token/refresh_token and attempt
    // to restore via supabase.auth.setSession(). This helps when getSession
    // doesn't return a session immediately but tokens exist locally.
    if (!session) {
      try {
        console.debug(
          "[auth:init] session not found, searching localStorage for tokens..."
        );
        let found = false;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          // look for keys that likely belong to supabase auth storage
          if (/supabase|sb:|supabase.auth/i.test(key)) {
            const raw = localStorage.getItem(key);
            try {
              const parsed = JSON.parse(raw);
              // parsed may be nested; search for access_token/refresh_token
              const access =
                parsed?.access_token ||
                parsed?.currentSession?.access_token ||
                parsed?.provider_token;
              const refresh =
                parsed?.refresh_token || parsed?.currentSession?.refresh_token;
              if (access && refresh) {
                console.debug("[auth:init] found tokens in", key);
                // Attempt to restore session
                const { data: setData, error: setError } =
                  await supabase.auth.setSession({
                    access_token: access,
                    refresh_token: refresh,
                  });
                if (setError) {
                  console.debug("[auth:init] setSession error", setError);
                } else {
                  console.debug("[auth:init] setSession success", setData);
                  session = setData?.session || null;
                  found = true;
                  break;
                }
              }
            } catch (e) {
              // not JSON or unexpected shape
            }
          }
        }
        if (!found)
          console.debug("[auth:init] no suitable token found in localStorage");
      } catch (e) {
        console.debug("[auth:init] localStorage fallback error", e);
      }
    }

    handleAuthChange(session);
    if (bootOverlay) {
      bootOverlay.setAttribute("aria-hidden", "true");
      bootOverlay.hidden = true;
    }
  } catch (err) {
    console.error("Failed to initialize auth UI:", err);
    // ensure overlay removed even on errors
    if (bootOverlay) {
      bootOverlay.setAttribute("aria-hidden", "true");
      bootOverlay.hidden = true;
    }
  }
})();

// hide boot overlay after initialization completes (used by rechecks too)
function hideBootOverlay() {
  if (!bootOverlay) return;
  bootOverlay.setAttribute("aria-hidden", "true");
  bootOverlay.hidden = true;
}

// Optional signout helper (not wired to UI by default)
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) alert(error.message);
}

// Expose supabase client for debugging in console
window.supabase = supabase;
