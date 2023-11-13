import 'package:functionally/io.dart';

enum LogType { error, info }

typedef Log = IO<void> Function(LogType, String);
