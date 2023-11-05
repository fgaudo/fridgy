import 'package:fgaudo_functional/io.dart';

enum LogType { error, info }

typedef Log = IO<void> Function(LogType, String);
