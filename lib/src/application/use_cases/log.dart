import 'package:functionally/reader.dart' as R;

import '../commands/log.dart';

typedef Log = ({
  void Function(String) debug,
  void Function(String) info,
  void Function(String) error
});

final R.Reader<LogCommand, Log> prepareLog = R.ask<LogCommand>();
