#!/usr/bin/env python3
"""
Patch MainActivity.java to enable immersive fullscreen mode.
Hides both the status bar and navigation bar on Android.
Safe to run multiple times (skips if already patched).
"""

import glob
import sys

files = glob.glob('android/app/src/main/java/**/MainActivity.java', recursive=True)
if not files:
    print("ERROR: MainActivity.java not found", file=sys.stderr)
    sys.exit(1)

path = files[0]
print(f"Patching {path}")

with open(path) as f:
    src = f.read()

if 'hideSystemUI' in src:
    print("Already patched, skipping.")
    sys.exit(0)

# --- Imports ---
imports = (
    "import android.os.Build;\n"
    "import android.view.View;\n"
    "import android.view.WindowInsets;\n"
    "import android.view.WindowInsetsController;\n"
)

# Insert imports after the package line
pkg_end = src.find('\n', src.find('package ')) + 1
src = src[:pkg_end] + '\n' + imports + src[pkg_end:]

# --- Methods to add ---
methods = """\

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUI();
    }

    private void hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            android.view.WindowInsetsController wic = getWindow().getInsetsController();
            if (wic != null) {
                wic.hide(WindowInsets.Type.systemBars());
                wic.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN);
        }
    }
"""

# Insert before the last closing brace of the class
last_brace = src.rfind('}')
src = src[:last_brace] + methods + src[last_brace:]

with open(path, 'w') as f:
    f.write(src)

print("Patched successfully.")
