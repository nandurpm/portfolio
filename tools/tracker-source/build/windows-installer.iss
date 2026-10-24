#ifndef AppSource
  #error AppSource is required
#endif
#ifndef AppVersion
  #define AppVersion "1.4.0"
#endif
#ifndef InstallDir
  #define InstallDir "{localappdata}\Programs\Savings and Expense Tracker"
#endif
[Setup]
AppId=com.nandakumar.savingsandexpencetracker
AppName=Savings and Expense Tracker
AppVersion={#AppVersion}
VersionInfoVersion={#AppVersion}
AppPublisher=Nandakumar
DefaultDirName={#InstallDir}
DefaultGroupName=Savings and Expense Tracker
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\Savings and Expense Tracker.exe
SetupIconFile=icon.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
OutputBaseFilename=Savings-and-Expense-Tracker-Setup
[Files]
Source: "{#AppSource}\*"; DestDir: "{app}"; Excludes: "unins*.exe,unins*.dat,unins*.msg,*.log"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{userdesktop}\Savings and Expense Tracker"; Filename: "{app}\Savings and Expense Tracker.exe"; WorkingDir: "{app}"
Name: "{userprograms}\Savings and Expense Tracker"; Filename: "{app}\Savings and Expense Tracker.exe"; WorkingDir: "{app}"
[Run]
Filename: "{app}\Savings and Expense Tracker.exe"; Description: "Open Savings and Expense Tracker"; Flags: postinstall nowait skipifsilent
