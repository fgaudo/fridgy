import 'package:functionally/reader_io.dart';

enum LogLevel { error, info, debug }

typedef Log<LOG> = ({
  ReaderIO<LOG, void> Function(String) debug,
  ReaderIO<LOG, void> Function(String) info,
  ReaderIO<LOG, void> Function(String) error
});
