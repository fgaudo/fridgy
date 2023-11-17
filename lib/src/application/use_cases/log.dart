import 'package:functionally/reader_io.dart';

import '../commands/log.dart';

typedef LogWithDeps = ({
  void Function(String) debug,
  void Function(String) info,
  void Function(String) error
});

typedef Log<LOG> = ({
  ReaderIO<LOG, void> Function(String) debug,
  ReaderIO<LOG, void> Function(String) info,
  ReaderIO<LOG, void> Function(String) error
});

typedef LogDeps<LOG> = ({LOG logEnv});

Log<LOG> prepareLog<LOG>({required LogCommand<LOG> log}) => log;
