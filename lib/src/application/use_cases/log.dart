import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/reader_io.dart' as RIO;

import '../commands/log.dart' as logCommand;

enum LogType { debug, info, error }

typedef Log = void Function(LogType, String);

RIO.ReaderIO<logCommand.LogCommand, void> prepareLog(
  LogType type,
  String message,
) =>
    RIO.ask<logCommand.LogCommand>().flatMapIO(
          (log) => log(
            switch (type) {
              LogType.debug => logCommand.LogType.debug,
              LogType.error => logCommand.LogType.error,
              LogType.info => logCommand.LogType.info
            },
            message,
          ),
        );
