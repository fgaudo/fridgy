import 'package:functionally/io.dart';
import 'package:functionally/reader_io.dart';

typedef DeleteFoodsByIdsReader<ENV> = ReaderIO<ENV, void> Function(
  Set<String> ids,
);

typedef DeleteFoodsByIds = IO<void> Function(
  Set<String> ids,
);
