import 'package:logging/logging.dart';

import '../../../application/commands/log.dart';

Log prepareLog(Logger logger) => (type, message) =>
    () => type == LogType.error ? logger.severe(message) : logger.fine(message);
