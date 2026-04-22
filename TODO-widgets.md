# Windows Widgets for WuzzChat 📱➡️🪟

## 🎯 Goal
Add WuzzChat as a **Windows Widget** (Win11): Adaptive Card on desktop (Win+W), with actions to launch chats.

## ✅ Ready Assets
- `widget-adaptive-card.json`: Card template (logo, title, recent sim, buttons: New Chat, ID+62, Recent, WA)
- `widget-demo.html`: Live preview (open with `start widget-demo.html`)

## 🚀 Native Widget Setup (WinUI 3)

### 1. Prerequisites (Windows 11 + VS 2022)
```
winget install Microsoft.VisualStudio.2022.Community --override "--wait --quiet --add Microsoft.VisualStudio.Workload.ManagedDesktop --includeRecommended"
winget install Microsoft.WinUI3Templates
```

### 2. Create WinUI Project
```
dotnet new winui -n WuzzChatWidget
cd WuzzChatWidget
```

### 3. Add Widgets API
`WinUIEx` NuGet:
```
dotnet add package CommunityToolkit.WinUI
dotnet add package Microsoft.Windows.SDK.BuildTools
```

### 4. Implement Widget (WinUIEx simple)
In `MainWindow.xaml.cs`:
```csharp
using WinUIEx;

public sealed partial class MainWindow : WindowEx {
    public MainWindow() {
        WidgetsService.Register(widgetUri => new Widgets.Widget1());
        WidgetsService.RegisterCompactFeedHandler(widgetUri => new Widgets.CompactFeed());
    }
}
```

**Compact Widget** (`Widgets/CompactFeed.cs`):
```csharp
using AdaptiveCards;

public class CompactFeed : UserControl, ICompactFeed {
    public CompactFeed() { /* Load card from hosted JSON */ }
    
    public Task<ICompactContentNode> GetContentAsync(string categoryId) {
        var card = new AdaptiveCard(/* fetch from gh-pages/widget-adaptive-card.json */);
        return Task.FromResult<ICompactContentNode>(card);
    }
}
```

### 5. Host Card JSON (for remote updates)
Deploy PWA to GitHub Pages:
```
gh repo deploy --to gh-pages
```
Card URL: `https://yourusername.github.io/mobile-development/widget-adaptive-card.json`

Fetch in C#: `HttpClient.GetStringAsync(cardUrl)`

### 6. Actions: Deep Link to PWA
Buttons open `mswwaweb://` or protocol `wuzz://number` (from manifest).

### 7. Package & Install
```
dotnet build
magpack --Project WuzzChatWidget.csproj --PackageName WuzzChatWidget.msix
Add-AppxPackage .\WuzzChatWidget.msix
```

## 🔗 Advanced: PWA Pinning Proxy
- Install PWA via Edge/Chrome → Pin to taskbar/start (closest to widget).
- Use `display: window-controls-overlay` in manifest for modern PWA.

## 📝 Next Steps
- [ ] Implement native WinUI project (above template).
- [ ] Dynamic recent chats (IndexedDB sync).
- [ ] Update card JSON with real history API.

**Test Demo**: `start widget-demo.html` → See exact widget look!



