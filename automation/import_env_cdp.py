import os
import time
from dotenv import dotenv_values
from playwright.sync_api import sync_playwright

# ==========================================
# CONFIGURATION
# ==========================================
ENV_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', '.env')
OVERWRITE_EXISTING = False 

ADD_VARIABLE_BTN_TEXT = "Add variable"
SAVE_SETTINGS_BTN_TEXT = "Save"
KEY_INPUT_PLACEHOLDER = "KEY"
VALUE_INPUT_PLACEHOLDER = "VALUE"
# ==========================================

def main():
    print(f"[*] Loading environment variables from: {ENV_FILE_PATH}")
    if not os.path.exists(ENV_FILE_PATH):
        print("[!] Error: .env file not found!")
        return
        
    env_vars = dotenv_values(ENV_FILE_PATH)
    if not env_vars:
        print("[!] No variables found in .env file.")
        return

    print(f"[*] Found {len(env_vars)} variables to import.\n")

    with sync_playwright() as p:
        try:
            # Connect to an existing Chrome browser running with --remote-debugging-port=9222
            browser = p.chromium.connect_over_cdp("http://localhost:9222")
            print("[+] Successfully connected to your open Chrome browser!")
        except Exception as e:
            print("[!] Could not connect to Chrome. Make sure you started Chrome with --remote-debugging-port=9222")
            print(f"Error details: {e}")
            return

        # Get the first context
        context = browser.contexts[0]
        
        # Find the tab that is currently on Back4App
        target_page = None
        for page in context.pages:
            if "back4app.com" in page.url:
                target_page = page
                break
                
        if not target_page:
            # If no back4app tab is found, use the first open tab and navigate
            target_page = context.pages[0]
            print("[*] Back4App tab not found. Navigating the current tab to Back4App...")
            target_page.goto("https://admin.back4app.com/containers")

        # Bring the page to front
        target_page.bring_to_front()

        print("=====================================================")
        print(" ACTION REQUIRED IN YOUR BROWSER:")
        print(" 1. Make sure you are on the Environment Variables page.")
        print("=====================================================")
        input(">>> Press ENTER in this terminal ONCE YOU ARE READY... ")
        print("\n[*] Starting automation...\n")

        added_count = 0
        skipped_count = 0

        for key, value in env_vars.items():
            if not key:
                continue
                
            existing_key = target_page.locator(f'input[value="{key}"]')
            if existing_key.count() > 0:
                if not OVERWRITE_EXISTING:
                    print(f"[-] SKIPPED: '{key}' (Already exists)")
                    skipped_count += 1
                    continue
                else:
                    print(f"[*] OVERWRITING: '{key}'")

            try:
                add_btn = target_page.get_by_role("button", name=ADD_VARIABLE_BTN_TEXT, exact=False)
                if add_btn.count() == 0:
                     add_btn = target_page.get_by_role("button", name="Add", exact=False)
                
                add_btn.first.click()
                time.sleep(0.5)
            except Exception as e:
                print(f"[!] ERROR: Could not click 'Add variable' for '{key}': {e}")
                continue

            key_inputs = target_page.get_by_placeholder(KEY_INPUT_PLACEHOLDER, exact=False)
            value_inputs = target_page.get_by_placeholder(VALUE_INPUT_PLACEHOLDER, exact=False)
            
            if key_inputs.count() == 0:
                key_inputs = target_page.locator('input[name="key"], input[name="name"], input[type="text"]')
            if value_inputs.count() == 0:
                value_inputs = target_page.locator('input[name="value"], input[type="text"]')
                
            try:
                key_inputs.last.fill(key)
                value_inputs.last.fill(str(value))
                
                print(f"[+] SUCCESS: Added '{key}'")
                added_count += 1
            except Exception as e:
                print(f"[!] ERROR: Could not fill inputs for '{key}': {e}")
            
            time.sleep(0.5)

        print(f"\n[*] Finished inserting variables! Added: {added_count}, Skipped: {skipped_count}")
        
        try:
            save_btn = target_page.get_by_role("button", name=SAVE_SETTINGS_BTN_TEXT, exact=False)
            if save_btn.count() > 0:
                save_btn.first.click()
                print("[*] Clicked 'Save Settings'.")
            else:
                print("[!] Could not find 'Save' button. Please save manually in the browser.")
        except Exception as e:
            print(f"[!] Error clicking save: {e}")

        print("\n[*] Automation complete! You can now close this terminal.")
        browser.disconnect()

if __name__ == "__main__":
    main()
