import tkinter as tk
from tkinter import filedialog
import os
import sys

def main():
    try:
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        selected_path = filedialog.askdirectory(title="Select Download Folder")
        root.destroy()
        if selected_path:
            print(os.path.abspath(selected_path))
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)

if __name__ == '__main__':
    main()
