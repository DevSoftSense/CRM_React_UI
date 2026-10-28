import { toast } from "react-toastify";

const defaultOpts = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
};

/**
 * Success toast (create / update / delete).
 * Same as Appointment appointmentToast.toastSuccess.
 */
export function toastSuccess(message) {
  toast.success(message || "Saved successfully.", defaultOpts);
}

/**
 * Error toast — prefers backend `{ message }` from axios interceptor (`err.message`).
 * Same as Appointment appointmentToast.toastError.
 */
export function toastError(message) {
  toast.error(message || "Something went wrong.", {
    ...defaultOpts,
    autoClose: 4500,
  });
}

/**
 * Map rejected API error → toast. Interceptor already sets `err.message` from backend.
 * Same as Appointment appointmentToast.toastApiError.
 */
export function toastApiError(err, fallback = "Something went wrong.") {
  const message =
    err?.message ||
    err?.response?.data?.message ||
    err?.data?.message ||
    fallback;
  toastError(message);
  return message;
}
