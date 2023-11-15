import 'package:functionally/reader_io.dart';
import 'package:logging/logging.dart';

import '../../../application/commands/log.dart';

final Log<Logger> log = (type, message) => ReaderIO(
      (logger) => () =>
          type == LogType.error ? logger.severe(message) : logger.info(message),
    );
