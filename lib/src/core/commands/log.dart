import 'package:functionally/reader_io.dart';

enum LogType { error, info }

typedef Log<LOG> = ReaderIO<LOG, void> Function(LogType, String);
