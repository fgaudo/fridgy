import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

enum LogType { info, debug, error }

typedef LogCommandReader<LOG> = ReaderIO<LOG, void> Function(LogType, String);

typedef LogCommand = IO<void> Function(LogType, String);
