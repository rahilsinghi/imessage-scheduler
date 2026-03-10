import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SEND_TIMEOUT_MS = 5_000;

/**
 * AppleScript that sends an iMessage. Arguments are passed via `argv`
 * (not string interpolation) to prevent injection attacks.
 *
 *   argv[0] = phone number
 *   argv[1] = message content
 */
const SEND_SCRIPT = `
on run argv
  set phoneNum to item 1 of argv
  set msgContent to item 2 of argv
  tell application "Messages"
    set targetService to 1st account whose service type = iMessage
    set targetBuddy to participant phoneNum of targetService
    send msgContent to targetBuddy
  end tell
end run
`;

const CHECK_SCRIPT = `
tell application "System Events"
  return (name of processes) contains "Messages"
end tell
`;

export interface SendResult {
  readonly success: true;
}

export interface SendError {
  readonly success: false;
  readonly error: string;
}

const log = (message: string): void => {
  console.log(`[gateway] ${message}`);
};

const classifyError = (stderr: string): string => {
  const lower = stderr.toLowerCase();

  if (lower.includes("not running") || lower.includes("connection is invalid")) {
    return "Messages.app is not running. Please open Messages and sign in to iMessage.";
  }

  if (lower.includes("invalid phone") || lower.includes("can't get participant")) {
    return "Invalid phone number or recipient not reachable via iMessage.";
  }

  return `AppleScript error: ${stderr.trim()}`;
};

/**
 * Send an iMessage to the given phone number.
 *
 * Phone number and content are passed as positional arguments to osascript,
 * never interpolated into the script string.
 */
export const sendMessage = async (
  phoneNumber: string,
  content: string,
): Promise<SendResult | SendError> => {
  const timestamp = new Date().toISOString();
  log(`[${timestamp}] Sending message to ${phoneNumber.slice(0, 4)}****`);

  try {
    await execFileAsync("osascript", ["-e", SEND_SCRIPT, phoneNumber, content], {
      timeout: SEND_TIMEOUT_MS,
    });

    log(`[${timestamp}] Message sent successfully to ${phoneNumber.slice(0, 4)}****`);
    return { success: true };
  } catch (err: unknown) {
    const error = err as { stderr?: string; killed?: boolean; code?: string };

    if (error.killed || error.code === "ETIMEDOUT") {
      const message = "Message send timed out after 5 seconds. Messages.app may be unresponsive.";
      log(`[${timestamp}] Timeout: ${message}`);
      return { success: false, error: message };
    }

    const message = classifyError(error.stderr ?? "Unknown error");
    log(`[${timestamp}] Failed: ${message}`);
    return { success: false, error: message };
  }
};

/**
 * Check whether Messages.app is currently running and accessible.
 * Returns true if the app process is found, false otherwise.
 */
export const checkMessagesAvailable = async (): Promise<boolean> => {
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", CHECK_SCRIPT], {
      timeout: SEND_TIMEOUT_MS,
    });
    return stdout.trim() === "true";
  } catch {
    return false;
  }
};
