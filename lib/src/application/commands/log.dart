import 'package:fgaudo_functional/reader.dart';

enum LogType { error, info }

typedef Log<ENV> = Reader<ENV, void> Function(LogType, String);
