import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

typedef Log<LOG> = ({
  ReaderIO<LOG, void> Function(String) debug,
  ReaderIO<LOG, void> Function(String) info,
  ReaderIO<LOG, void> Function(String) error
});

typedef LogWithDeps = ({
  IO<void> Function(String) debug,
  IO<void> Function(String) info,
  IO<void> Function(String) error
});
