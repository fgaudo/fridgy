import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

import '../commands/log.dart';

typedef LogWithDeps = ({
  IO<void> Function(String) debug,
  IO<void> Function(String) info,
  IO<void> Function(String) error
});

typedef Log<LOG> = ({
  ReaderIO<LOG, void> Function(String) debug,
  ReaderIO<LOG, void> Function(String) info,
  ReaderIO<LOG, void> Function(String) error
});

typedef LogCommands<LOG> = ({LogCommand<LOG> log});

Log<LOG> prepareLog<LOG>(LogCommands<LOG> commands) => commands.log;
