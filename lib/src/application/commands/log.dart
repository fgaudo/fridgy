import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

typedef LogCommandReader<LOG> = ({
  ReaderIO<LOG, void> Function(String) debug,
  ReaderIO<LOG, void> Function(String) info,
  ReaderIO<LOG, void> Function(String) error
});

typedef LogCommand = ({
  IO<void> Function(String) debug,
  IO<void> Function(String) info,
  IO<void> Function(String) error
});
