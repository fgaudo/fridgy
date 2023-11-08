import 'package:fgaudo_functional/reader_io.dart';

enum LogType { error, info }

typedef Log<ENV> = ReaderIO<ENV, void> Function(LogType, String);
