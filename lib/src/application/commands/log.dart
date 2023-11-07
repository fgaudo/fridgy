enum LogType { error, info }

typedef Log = void Function(LogType, String);
