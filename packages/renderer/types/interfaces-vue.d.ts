// Copyright (c) 2022 MillenniumEarl
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export interface IQuery {
  title?: string;
  author?: string;
  lastUpdate?: Date;
  userCompleted?: boolean;
  status?: string[];
  tags?: string[];
}