import os
import time
from dotenv import dotenv_values
from playwright.sync_api import sync_playwright

# ==========================================
# CONFIGURATION
# ==========================================
# Path to your .env file
ENV_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', '.env')

# Change to True if you want to overwrite existing variables
OVERWRITE_EXISTING = False 

# Adjust these selectors if the Back4App UI changes
ADD_VARIABLE_BTN_TEXT = "Add variable"
SAVE_SETTINGS_BTN_TEXT = "Save"
KEY_INPUT_PLACEHOLDER = "KEY"   # Usually "KEY" or "Name" in dashboards
VALUE_INPUT_PLACEHOLDER = "VALUE" # Usually "VALUE"
# ==========================================

def main():
    print(f"[*] Loading environment variables from: {ENV_FILE_PATH}")
    if not os.path.exists(ENV_FILE_PATH):
        print("[!] Error: .env file not found!")
        return
        
    # python-dotenv automatically ignores empty lines and comments (#)
    env_vars = dotenv_values(ENV_FILE_PATH)
    if not env_vars:
        print("[!] No variables found in .env file.")
        return

    print(f"[*] Found {len(env_vars)} variables to import.\n")

    with sync_playwright() as p:
        # Launch Chrome (non-headless) so you can manually log in
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to Back4App
        page.goto("https://admin.back4app.com/containers")
        
        print("=====================================================")
        print(" ACTION REQUIRED IN BROWSER:")
        print(" 1. Log in to Back4App (if required).")
        print(" 2. Open your Container App.")
        print(" 3. Navigate to App Settings -> Environment Variables.")
        print("=====================================================")
        input(">>> Press ENTER in this terminal ONCE YOU ARE ON THE ENVIRONMENT VARIABLES PAGE... ")
        print("\n[*] Starting automation...\n")

        added_count = 0
        skipped_count = 0

        for key, value in env_vars.items():
            if not key:
                continue
                
            # Check if key already exists by looking for an input with the key's value
            existing_key = page.locator(f'input[value="{key}"]')
            if existing_key.count() > 0:
                if not OVERWRITE_EXISTING:
                    print(f"[-] SKIPPED: '{key}' (Already exists)")
                    skipped_count += 1
                    continue
                else:
                    print(f"[*] OVERWRITING: '{key}'")
                    # (Optional) Implement overwrite logic here if needed

            # Click "Add variable"
            try:
                # Try finding button by exact text or fallback to generic "Add"
                add_btn = page.get_by_role("button", name=ADD_VARIABLE_BTN_TEXT, exact=False)
                if add_btn.count() == 0:
                     add_btn = page.get_by_role("button", name="Add", exact=False)
                
                add_btn.first.click()
                time.sleep(0.5) # Wait for UI to render the new inputs
            except Exception as e:
                print(f"[!] ERROR: Could not click 'Add variable' for '{key}': {e}")
                continue

            # Find the newly added empty inputs. 
            # We assume the newly added row is the LAST pair of key/value inputs on the page.
            key_inputs = page.get_by_placeholder(KEY_INPUT_PLACEHOLDER, exact=False)
            value_inputs = page.get_by_placeholder(VALUE_INPUT_PLACEHOLDER, exact=False)
            
            # Fallback selectors if placeholders don't match
            if key_inputs.count() == 0:
                key_inputs = page.locator('input[name="key"], input[name="name"], input[type="text"]')
            if value_inputs.count() == 0:
                value_inputs = page.locator('input[name="value"], input[type="text"]')
                
            try:
                # Fill the last input found (which corresponds to the newly added row)
                key_inputs.last.fill(key)
                value_inputs.last.fill(str(value))
                
                print(f"[+] SUCCESS: Added '{key}'")
                added_count += 1
            except Exception as e:
                print(f"[!] ERROR: Could not fill inputs for '{key}': {e}")
            
            time.sleep(0.5)

        print(f"\n[*] Finished inserting variables! Added: {added_count}, Skipped: {skipped_count}")
        
        # Click Save Settings
        try:
            save_btn = page.get_by_role("button", name=SAVE_SETTINGS_BTN_TEXT, exact=False)
            if save_btn.count() > 0:
                save_btn.first.click()
                print("[*] Clicked 'Save Settings'.")
            else:
                print("[!] Could not find 'Save' button. Please save manually in the browser.")
        except Exception as e:
            print(f"[!] Error clicking save: {e}")

        print("\n[*] Automation complete! The browser will stay open for 60 seconds so you can verify.")
        time.sleep(60)
        browser.close()

if __name__ == "__main__":
    main()
