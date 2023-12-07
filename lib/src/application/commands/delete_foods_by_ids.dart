import 'package:functionally/reader_task.dart';
import 'package:functionally/task.dart';

typedef DeleteFoodsByIdsReader<ENV> = ReaderTask<ENV, void> Function(
  Set<String> ids,
);

typedef DeleteFoodsByIds = Task<void> Function(
  Set<String> ids,
);
