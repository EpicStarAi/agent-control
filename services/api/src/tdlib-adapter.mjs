const TD_METHODS = {
  qr: "requestQrCodeAuthentication",
  phone: "setAuthenticationPhoneNumber",
  code: "checkAuthenticationCode",
  logout: "logOut"
};

export function getTdlibAdapterStatus() {
  return {
    runtimeAdapter: "stub",
    nativeBindingLoaded: false,
    requiredMethods: TD_METHODS,
    message: "TDLib config is separated from the native TDLib runtime. Install and wire a tdjson binding before real Telegram authorization."
  };
}

export async function requestTdlibQrAuth() {
  return {
    ok: false,
    method: TD_METHODS.qr,
    message: "Native TDLib adapter is not wired yet."
  };
}

export async function requestTdlibPhoneAuth() {
  return {
    ok: false,
    method: TD_METHODS.phone,
    message: "Native TDLib adapter is not wired yet."
  };
}

export async function checkTdlibAuthenticationCode() {
  return {
    ok: false,
    method: TD_METHODS.code,
    message: "Native TDLib adapter is not wired yet."
  };
}
