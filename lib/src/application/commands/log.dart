import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

enum LogType { info, debug, error }

typedef LogReader<ENV> = ReaderIO<ENV, void> Function(LogType, String);

typedef Log = IO<void> Function(LogType, String);
